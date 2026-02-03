import * as path from "path";
import * as vscode from "vscode";
import {
  IssueIntf,
  DiagnosticsPublisherIntf,
} from "src/pylintstatic/diagnostics";

// A thin diagnostics manager that forwards issues to a language client
// via a reporter function. This avoids requiring the language client
// in tests; the extension will provide a reporter that sends a
// "pylint/diagnostics" notification to the server.
export default class DiagnosticsPublisher implements DiagnosticsPublisherIntf {
  private readonly byFile = new Map<string, any[]>();
  private readonly reporter: (params: {
    uri: string;
    issues: IssueIntf[];
  }) => void;
  // Optional per-issue streaming reporter (used to send single issues to LSP)
  private readonly reporterStream: (params: {
    uri: string;
    issue: IssueIntf;
  }) => void | Promise<void>;

  public constructor(
    reporter: (params: { uri: string; issues: IssueIntf[] }) => void,
    reporterStream: (params: {
      uri: string;
      issue: IssueIntf;
    }) => void | Promise<void>,
  ) {
    // reporter is expected to send a notification to the LSP server
    // If no reporter is provided, fall back to local DiagnosticCollection
    // for compatibility (useful in tests).
    this.reporter = reporter;
    this.reporterStream = reporterStream;
  }

  public dispose(): void {
    this.byFile.clear();
  }

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
    // fallbackReporter will also clear the VS Code collection if used
  }

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

    // If a per-issue streaming reporter is available, use it for
    // immediate single-issue delivery (reliable with retries). Do not
    // call the bulk reporter on every add in that case — bulk reporter
    // will be invoked on flush(). If no reporterStream is present,
    // fall back to bulk reporter behavior per-add.
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
