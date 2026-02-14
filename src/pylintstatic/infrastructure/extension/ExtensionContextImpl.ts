import AsAbsolutePathIntf from "#PylintWrapper/vscodeextension/AsAbsolutePathIntf";
import ConstantsClass from "src/pylintstatic/vscodeextension/ConstantsClass";
import ExtensionContextIntf from "#PylintWrapper/vscodeextension/ExtensionContextIntf";
import * as vscode from "vscode";

/**
 * Adapter around VsCode API's
 * @implements {ExtensionContextIntf}
 */
export default class VsCodeExtensionContext implements ExtensionContextIntf {
  /**
   * Array manages lifecycle of extension's disposable objects
   */
  public readonly subscriptions: { push(disposable: vscode.Disposable): void };

  /**
   * Handle to function that resolves absolute paths of extension scripts.
   * Enables extension to function using different dist/ or out/ resources depending on
   * build or test.
   */
  public readonly asAbsolutePath: AsAbsolutePathIntf;

  /**
   * Construct adapted extension context instance.
   * Resolves absolute path of extension resources.
   * @param {vscode.ExtensionContext} ctx - raw extension context object
   */
  public constructor(ctx: vscode.ExtensionContext) {
    this.subscriptions = ctx.subscriptions;
    this.asAbsolutePath = ctx.asAbsolutePath.bind(ctx);
  }

  /**
   * Resolves user's workspace folder location.
   * @returns {vscode.WorkspaceFolder} handle to workspace folder
   */
  public getWorkspaceFolder(): vscode.WorkspaceFolder {
    if (vscode.workspace.workspaceFolders === undefined) {
      throw new Error(ConstantsClass.displayErrorWorkspaceFolderUndefined);
    }
    return vscode.workspace.workspaceFolders?.[0];
  }

  /**
   * Retrieves and returns user's settings, including for this extension.
   * @param {string} section - settings filter expression
   * @param {vscode.Uri} scope - location to check
   * @returns {vscode.WorkspaceConfiguration} settings container
   */
  public getConfiguration(
    section: string,
    scope?: vscode.Uri,
  ): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(section, scope);
  }

  /**
   * Registers a single application, exposed to user as VsCode command
   * @param {string} command - identifier
   * @param {(...args: any[]) => any} callback - application entrypoint
   * @returns {vscode.Disposable} - application resource
   */
  public registerCommand(
    command: string,
    callback: (...args: any[]) => any,
  ): vscode.Disposable {
    return vscode.commands.registerCommand(command, callback);
  }

  /**
   * Handles errors that applications raise. Returns UI error display callback.
   * @param {string} message
   * @returns {Thenable<string | undefined>} - UI error display callback
   */
  public showErrorMessage(message: string): Thenable<string | undefined> {
    return vscode.window.showErrorMessage(message);
  }
}
