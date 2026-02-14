import * as path from "path";
import * as vscode from "vscode";

import {
  IssueIntf,
  DiagnosticsPublisherIntf,
} from "#PylintWrapper/diagnostics";

import ReporterIntf from "./ReporterIntf";
import ReporterStreamIntf from "./ReporterStreamIntf";

/**
 * Diagnostics Publisher
 *
 * Forwards issues to (a language server implementing the Language Server Protocol (LSP) / any destination),
 * through a reporter function.
 *
 * Similarly clears issues on request.
 */
export default class DiagnosticsPublisher implements DiagnosticsPublisherIntf {
  private readonly byFile = new Map<string, any[]>();

  /**
   * Construct a diagnostics publisher by specifying publishing behavior; these are
   * functions expected to push to a LSP server.
   * @param {ReporterIntf} reporter - batch publishing function
   * @param {ReporterStreamIntf} reporterStream - publishing function
   */
  public constructor(
    private readonly reporter: ReporterIntf,
    private readonly reporterStream: ReporterStreamIntf,
  ) {}

  /**
   * Clears the internal hashmap of uri: diagnostic records.
   */
  public dispose(): void {
    this.byFile.clear();
  }

  /**
   * Clear diagnostics from entire workspace. Pushes empty diagnostics to LSP server.
   * Resets internal hashmap.
   */
  public clear(): void {
    // Notify reporter for each tracked file with an empty issue list so
    // any remote diagnostics sink (language client/server) can publish
    // an empty diagnostics array and clear the Problems UI. Then clear
    // the local map.
    try {
      for (const [uri] of this.byFile.entries()) {
        try {
          this.reporter({ uri, issues: [] });
        } catch (e) {
          // ignore per-uri reporter errors
        }
      }
    } catch (e) {
      // ignore overall errors
    }
    this.byFile.clear();
  }

  /**
   * Clears diagnostics whose URI match a regular expression. This is used to reset
   * specific resources between runs.
   *
   * How: pushes empty diagnostics to matching records via LSP server
   *  & clears internap hashmap for these records.
   * @param {RegExp} pattern - regular matching pattern
   */
  public clearUriMatch(pattern: RegExp): void {
    try {
      for (const [uri] of this.byFile.entries()) {
        try {
          if (pattern.test(uri)) {
            try {
              this.reporter({ uri, issues: [] });
            } catch (e) {
              // ignore per-uri reporter errors
            }
            this.byFile.delete(uri);
          }
        } catch (e) {
          // ignore per-entry errors
        }
      }
    } catch (e) {
      // ignore overall errors
    }
  }

  /**
   * Adds a diagnostic. Pushes it to the LSP server so it shows up in the vscode problems UI.
   * @param {IssueIntf} issue - diagnostic object
   * @param {vscode.WorkspaceFolder} workspaceFolder
   */
  public addIssue(
    issue: IssueIntf,
    workspaceFolder: vscode.WorkspaceFolder,
  ): void {
    const filePath = path.isAbsolute(issue.file)
      ? issue.file
      : path.join(workspaceFolder.uri.fsPath, issue.file);
    const uri = vscode.Uri.file(filePath).toString();

    const list = this.byFile.get(uri) || [];
    list.push(issue);
    this.byFile.set(uri, list);

    // immediate single-issue delivery
    this.reporterStream({
      uri,
      issue,
    });
  }
  // Flush all pending diagnostics to the reporter (useful once a client
  // becomes ready so any buffered issues are published via LSP).
  public flush(): void {
    for (const [uri, issues] of this.byFile.entries()) {
      this.reporter({ uri, issues });
    }
  }
}
