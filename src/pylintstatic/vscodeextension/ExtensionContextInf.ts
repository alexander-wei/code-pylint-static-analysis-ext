import * as vscode from "vscode";

/** -----------------------------
 *  Context abstraction
 *  ----------------------------- */

interface ExtensionContextIntf {
  readonly subscriptions: { push(disposable: vscode.Disposable): void };

  getWorkspaceFolder(): vscode.WorkspaceFolder;

  getConfiguration<T = unknown>(
    section: string,
    scope?: vscode.Uri,
  ): vscode.WorkspaceConfiguration;

  registerTaskProvider(
    type: string,
    provider: vscode.TaskProvider,
  ): vscode.Disposable;

  registerCommand(
    command: string,
    callback: (...args: any[]) => any,
  ): vscode.Disposable;

  executeTask(task: vscode.Task): Thenable<vscode.TaskExecution>;

  showErrorMessage(message: string): Thenable<string | undefined>;
}

export default ExtensionContextIntf;
