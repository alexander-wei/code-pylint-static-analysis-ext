import { spawn, ChildProcess } from "child_process";
import IssueImpl from "../../application/parsing/IssueImpl";
import DiagnosticsPublisherIntf from "../../diagnostics/DiagnosticsPublisherIntf";
import ExtensionContextIntf from "../../vscodeextension/ExtensionContextIntf";
import * as vscode from "vscode";
import HandleBufferCallableIntf from "src/pylintstatic/application/parsing/HandleBufferIntf";

export const PATT = /^(.*):(\d+):(\d+):\s+(W|E|I|R|C)([^:]*):\s+(.*)$/;
export const PATT_ALT = /^(.*):(\d+):\s*\[([A-Z]\d+)[^\]]*\]\s*(.*)$/;

/**
 * PylintGateway
 */

export default class PylintGateway {
  private pylintBin: string;
  private pylintArgs: string[];
  // Active child process for the currently running lint task (if any).
  private proc?: ChildProcess;
  private cancelled = false;

  constructor(
    private diagnosticsManager: DiagnosticsPublisherIntf,
    private extensionContext: ExtensionContextIntf,
    private readonly handleBuffer: HandleBufferCallableIntf,
    private cwd: string,
    pylintBin: string,
    ...pylintArgs: string[]
  ) {
    this.pylintBin = pylintBin;
    this.pylintArgs = pylintArgs;
  }

  public execute(token?: vscode.CancellationToken): Promise<void> {
    if (!this.pylintBin) {
      process.stderr.write(
        "[pylint-wrapper] ERROR: missing pylint binary path\n",
      );
      // Do not exit the host process from inside the extension; return so the
      // extension host (and test harness) can continue running. Calling
      // process.exit here would kill the extension host and cause flaky
      // test failures.
      return Promise.resolve();
    }

    this.proc = spawn(this.pylintBin, this.pylintArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: this.cwd,
    });

    this.proc.stdout?.on("data", (c) => this.handleBuffer(c, process.stdout));
    this.proc.stderr?.on("data", (c) => this.handleBuffer(c, process.stdout));

    // Wire cancellation: attempt graceful interrupt (SIGINT), then SIGKILL.
    if (token) {
      token.onCancellationRequested(() => {
        this.cancelled = true;
        try {
          this.proc?.kill("SIGINT");
        } catch {
          // ignore
        }
        setTimeout(() => {
          try {
            this.proc?.kill("SIGKILL");
          } catch {
            // ignore
          }
        }, 2000);
      });
    }

    return new Promise<void>((resolve, reject) => {
      this.proc?.on("close", (code, signal) => {
        // Log the child process exit but do not terminate the host process.
        try {
          console.log(
            `[pylint-wrapper] pylint process closed (code=${code}, signal=${signal})`,
          );
        } catch {
          // ignore logging errors
        }
        // clear reference
        this.proc = undefined;
        resolve();
      });
      this.proc?.on("error", (err) => {
        try {
          console.error("[pylint-wrapper] pylint process error", err);
        } catch {
          // ignore
        }
        this.proc = undefined;
        reject(err);
      });
    });
  }
}
