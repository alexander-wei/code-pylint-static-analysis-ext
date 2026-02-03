import { Disposable, WorkspaceFolder } from "vscode";
import IssueIntf from "src/pylintstatic/diagnostics/IssueIntf";

interface DiagnosticsPublisherIntf extends Disposable {
  clear(): void;

  clearUriMatch(pattern: RegExp): void;

  addIssue(issue: IssueIntf, workspaceFolder: WorkspaceFolder): void;

  flush(): void;

  dispose(): void;
}

export default DiagnosticsPublisherIntf;
