import { WorkspaceFolder } from "vscode";

import DiagnosticsPublisherIntf from "#PylintWrapper/diagnostics/DiagnosticsPublisherIntf";
import ExtensionContextIntf from "#PylintWrapper/vscodeextension/ExtensionContextIntf";
import PythonInterpreter from "src/pylintstatic/infrastructure/pylint/PythonInterpreter";

import PylintWrappedSettingsReader from "./PylintWrappedSettingsReader";
import IssueImpl from "./IssueImpl";

/**
 * Orchestrates execution of the Pylint CLI tool. Transforms its buffered stdout stream
 * into Issue objects. Pushes Issue objects to Diagnostics service.
 */
export default class PylintWrappedTask {
  /**
   * Primary Pylint output pattern:
   *   file:line:column: <CATEGORY><CODE>: message
   *
   * Example:
   *   api/models.py:79:25: I C0209: Formatting a regular string ...
   */
  public static readonly PATT =
    /^(.*):(\d+):(\d+):\s+(W|E|I|R|C)([^:]*):\s+(.*)$/;

  /**
   * Alternate Pylint output format:
   *   file:line: [CODE] message
   *
   * Example:
   *   api/models.py:79: [C0209] Formatting a regular string ...
   */
  public static readonly PATT_ALT =
    /^(.*):(\d+):\s*\[([A-Z]\d+)[^\]]*\]\s*(.*)$/;

  /**
   * Construct a Pylint wrapper application
   *
   * @param {ExtensionContextIntf} ext - extension context (vscode specific)
   * @param {PylintWrappedSettingsReader} settingsReader - extension *user settings* reader
   * @param {DiagnosticsPublisher} diagnosticsManager - collects diagnostics
   */
  public constructor(
    private readonly ext: ExtensionContextIntf,
    private readonly settingsReader: PylintWrappedSettingsReader,
    private readonly diagnosticsManager: DiagnosticsPublisherIntf,
  ) {}

  /**
   * Creates the spawn vector (Cli path to executable, *arguments) that will be used to launch
   * Pylint.
   *
   * @param {WorkspaceFolder} folder - handle to workspace folder/resource; cwd
   * @param {string} target - path to target passed to pylint
   * @returns {Promise<{ command: string; args: string[]; cwd: string }>} Cli spawn vector
   */
  public async createSpawn(
    folder: WorkspaceFolder,
    target: string = ".",
  ): Promise<{ command: string; args: string[]; cwd: string }> {
    const settings = this.settingsReader.read(folder);

    // Keep paths relative so the matcher can use fileLocation relative to workspace.
    const cwd = folder.uri.fsPath;

    const args: string[] = [];
    var command: string;

    if (settings.usePythonModule) {
      const pythonExe =
        await PythonInterpreter.resolvePythonInterpreter(folder);
      command = pythonExe;
      args.push(
        "-m",
        "pylint",
        target,
        ...(settings.recursive ? ["--recursive=y"] : []),
        ...(settings.enableAll ? ["--enable=all"] : []),
        ...settings.extraArgs,
      );
    } else {
      command = settings.pylintPath;
      args.push(
        target,
        ...(settings.recursive ? ["--recursive=y"] : []),
        ...(settings.enableAll ? ["--enable=all"] : []),
        ...settings.extraArgs,
      );
    }

    return { command: command, args, cwd };
  }

  /**
   * Accept a text buffer. Parse Pylint messages from their syntax. Push extracted diagnostics
   * to LSP server/
   *
   * @param {Buffer} chunk - input buffer (raw text output from pylint with standard output mode)
   * @param {NodeJS.WritableStream} out - handle to output stream for debugging
   */
  public handle(chunk: Buffer, out: NodeJS.WritableStream): void {
    // Buffer a logical block: first line + following continuation lines
    const text = chunk.toString("utf8");
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const isLast = i === lines.length - 1;
      const line = lines[i];
      if (line === "" && isLast) {
        continue;
      }
      const buffer: string[] = [line];
      // Determine continuation lines. A line is considered the start of a
      // new issue if IssueImpl.fromLine(parsedLine) returns a non-null
      // IssueImpl. Otherwise treat the line as a continuation of the
      // current issue. We preserve explicit rules for lines beginning with
      // '==' (pylint blocks) or leading whitespace which are always
      // continuations.
      const isIssueLine = (ln: string) => {
        try {
          return (
            IssueImpl.fromLine(
              (ln || "") + "\n",
              PylintWrappedTask.PATT,
              PylintWrappedTask.PATT_ALT,
            ) !== null
          );
        } catch (e) {
          return false;
        }
      };
      const isPylintBanner = (ln: string): boolean =>
        /^\s*\*{5,}(?:\s|$)/.test(ln);
      const isSeparatorLine = (ln: string): boolean => /^\s*-{5,}\s*$/.test(ln);
      const isRatingLine = (ln: string): boolean =>
        /^\s*Your code has been rated at\b/.test(ln);

      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        // If the next line parses as a new issue, stop collecting
        if (
          isIssueLine(next) ||
          isPylintBanner(next) ||
          isSeparatorLine(next) ||
          isRatingLine(next)
        ) {
          break;
        }
        if (/^==/.test(next) || /^\s/.test(next)) {
          buffer.push(next);
          i += 1;
          continue;
        }
        buffer.push(next);
        i += 1;
      }

      const firstRaw = buffer[0] + "\n";
      const issue = IssueImpl.fromLine(
        firstRaw,
        PylintWrappedTask.PATT,
        PylintWrappedTask.PATT_ALT,
      );

      if (issue) {
        // append continuation lines
        for (let j = 1; j < buffer.length; j++) {
          issue.appendContinuation(buffer[j] + "\n");
        }
        // print single JSON marker for the issue
        out.write(`__PYLINT_ISSUE__ ${JSON.stringify(issue.toJSON())}\n`);

        this.diagnosticsManager.addIssue(
          issue,
          this.ext.getWorkspaceFolder() as any,
        );
      } else {
        // not an issue: write the buffered lines verbatim
        for (let j = 0; j < buffer.length; j++) {
          out.write(buffer[j] + "\n");
        }
      }
    }
  }
}
