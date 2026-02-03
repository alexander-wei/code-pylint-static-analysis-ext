/** -----------------------------
 *  Task class
 *  ----------------------------- */

import ExtensionContextIntf from "src/pylintstatic/vscodeextension/ExtensionContextInf";
import PylintWrappedSettingsReader from "./PylintWrappedSettingsReader";

import PythonInterpreter from "src/pylintstatic/infrastructure/pylint/PythonInterpreter";
import * as vscode from "vscode";
import DiagnosticsPublisher from "../publishing/DiagnosticsPublisher";

import IssueImpl from "./IssueImpl";
import { DiagnosticsPublisherIntf } from "src/pylintstatic/diagnostics";

export default class PylintWrappedTask {
  public static readonly PATT =
    /^(.*):(\d+):(\d+):\s+(W|E|I|R|C)([^:]*):\s+(.*)$/;
  public static readonly PATT_ALT =
    /^(.*):(\d+):\s*\[([A-Z]\d+)[^\]]*\]\s*(.*)$/;

  public constructor(
    private readonly ext: ExtensionContextIntf,
    private readonly settingsReader: PylintWrappedSettingsReader,
    private readonly diagnosticsManager: DiagnosticsPublisher,
  ) {}

  /**
   * Returns command/args/cwd suitable for programmatic spawning by the
   * extension (so we can run pylint once and capture structured issue
   * markers). This mirrors createExecution but exposes the raw pieces.
   */
  public async createSpawn(
    folder: vscode.WorkspaceFolder,
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

  public handle(chunk: Buffer, out: NodeJS.WritableStream): void {
    const text = chunk.toString("utf8");
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const isLast = i === lines.length - 1;
      const line = lines[i];
      if (line === "" && isLast) {
        continue;
      }

      // Buffer a logical block: first line + following continuation lines
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

      while (i + 1 < lines.length) {
        const next = lines[i + 1];

        if (/^==/.test(next) || /^\s/.test(next)) {
          buffer.push(next);
          i += 1;
          continue;
        }
        // If the next line parses as a new issue, stop collecting
        if (isIssueLine(next)) {
          break;
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
        // print single JSON marker for the issue so an in-extension caller
        // can parse structured issues when the runner is executed programmatically.
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
