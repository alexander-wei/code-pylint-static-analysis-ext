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
  readonly subscriptions: { push(disposable: Disposable): void };

  getWorkspaceFolder(): WorkspaceFolder;

  getConfiguration<T = unknown>(
    section: string,
    scope?: Uri,
  ): WorkspaceConfiguration;

  registerTaskProvider(type: string, provider: TaskProvider): Disposable;

  registerCommand(
    command: string,
    callback: (...args: any[]) => any,
  ): Disposable;

  executeTask(task: Task): Thenable<TaskExecution>;

  showErrorMessage(message: string): Thenable<string | undefined>;

  asAbsolutePath(relativePath: string): string;
}

export default ExtensionContextIntf;
