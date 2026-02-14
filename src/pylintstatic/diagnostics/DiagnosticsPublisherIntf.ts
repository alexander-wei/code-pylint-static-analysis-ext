import { Disposable, WorkspaceFolder } from "vscode";
import IssueIntf from "src/pylintstatic/diagnostics/IssueIntf";

/**
 * Diagnostics Publisher interface
 * Accepts issues (diagnostic objects) and clears issues
 */
interface DiagnosticsPublisherIntf extends Disposable {
  /**
   * Clear issues across entire workspace
   */
  clear(): void;

  /**
   * Clear issues matching a regular expression
   * @param {RegExp} pattern
   */
  clearUriMatch(pattern: RegExp): void;

  /**
   * Add an issue
   * @param {IssueIntf} issue
   * @param {WorkspaceFolder} workspaceFolder
   */
  addIssue(issue: IssueIntf, workspaceFolder: WorkspaceFolder): void;

  /**
   * Synchronize internal diagnostic state with its destination
   */
  flush(): void;

  /**
   * Dispose of the internal diagnostic state
   */
  dispose(): void;
}

export default DiagnosticsPublisherIntf;
