import {
  Uri,
  WorkspaceConfiguration,
  WorkspaceFolder,
  TaskProvider,
  Disposable,
  Task,
  TaskExecution,
} from "vscode";

/**
 * VsCode extension context interface
 */
interface ExtensionContextIntf {
  /**
   * Array manages lifecycle of extension's disposable objects
   */
  readonly subscriptions: { push(disposable: Disposable): void };

  getWorkspaceFolder(): WorkspaceFolder;

  getConfiguration<T = unknown>(
    section: string,
    scope?: Uri,
  ): WorkspaceConfiguration;

  registerCommand(
    command: string,
    callback: (...args: any[]) => any,
  ): Disposable;

  showErrorMessage(message: string): Thenable<string | undefined>;

  asAbsolutePath(relativePath: string): string;
}

export default ExtensionContextIntf;
