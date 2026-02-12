import AsAbsolutePathIntf from "#PylintWrapper/vscodeextension/AsAbsolutePathIntf";
import ConstantsClass from "src/pylintstatic/vscodeextension/ConstantsClass";
import ExtensionContextIntf from "#PylintWrapper/vscodeextension/ExtensionContextIntf";
import * as vscode from "vscode";

/**
 * Adapter around VsCode API's
 * @implements {ExtensionContextIntf}
 */
export default class VsCodeExtensionContext implements ExtensionContextIntf {
  public readonly subscriptions: { push(disposable: vscode.Disposable): void };

  public readonly asAbsolutePath: AsAbsolutePathIntf;

  public constructor(private readonly ctx: vscode.ExtensionContext) {
    this.subscriptions = ctx.subscriptions;
    this.asAbsolutePath = ctx.asAbsolutePath.bind(ctx);
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
