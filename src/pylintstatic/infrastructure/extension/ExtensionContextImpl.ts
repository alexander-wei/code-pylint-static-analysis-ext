import ConstantsClass from "src/pylintstatic/vscodeextension/ConstantsClass";
import ExtensionContextIntf from "src/pylintstatic/vscodeextension/ExtensionContextInf";
import * as vscode from "vscode";

/**
 * Concrete adapter around vscode APIs.
 * This is the only place that touches vscode.* directly.
 */
export default class VsCodeExtensionContext implements ExtensionContextIntf {
  public readonly subscriptions: { push(disposable: vscode.Disposable): void };

  public constructor(private readonly ctx: vscode.ExtensionContext) {
    this.subscriptions = ctx.subscriptions;
  }

  public getWorkspaceFolder(): vscode.WorkspaceFolder {
    if (vscode.workspace.workspaceFolders === undefined) {
      throw new Error(ConstantsClass.displayErrorWorkspaceFolderUndefined);
    }
    return vscode.workspace.workspaceFolders?.[0];
  }

  public getConfiguration(
    section: string,
    scope?: vscode.Uri,
  ): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(section, scope);
  }

  public registerTaskProvider(
    type: string,
    provider: vscode.TaskProvider,
  ): vscode.Disposable {
    return vscode.tasks.registerTaskProvider(type, provider);
  }

  public registerCommand(
    command: string,
    callback: (...args: any[]) => any,
  ): vscode.Disposable {
    return vscode.commands.registerCommand(command, callback);
  }

  public executeTask(task: vscode.Task): Thenable<vscode.TaskExecution> {
    return vscode.tasks.executeTask(task);
  }

  public showErrorMessage(message: string): Thenable<string | undefined> {
    return vscode.window.showErrorMessage(message);
  }
}
