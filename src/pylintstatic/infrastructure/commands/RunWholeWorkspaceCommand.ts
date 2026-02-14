import * as vscode from "vscode";
import PylintWrappedTask from "../../application/parsing/PylintWrappedTask";
import DiagnosticsPublisherIntf from "../../diagnostics/DiagnosticsPublisherIntf";
import ExtensionContextIntf from "#PylintWrapper/vscodeextension/ExtensionContextIntf";

import PylintGateway from "src/pylintstatic/infrastructure/pylint/PylintGateway";
import CommandIntf from "./CommandIntf";
import { ConstantsClass } from "src/pylintstatic/vscodeextension";

/**
 * Command to run pylint against entire workspace.
 */
export default class RunWholeWorkspaceCommand implements CommandIntf {
  public static readonly id =
    `${ConstantsClass.appName}.${ConstantsClass.commandRunWholeWorkspaceId}` as const;

  public constructor(
    private readonly ext: ExtensionContextIntf,
    private readonly taskFactory: PylintWrappedTask,
    private readonly diagnosticsManager: DiagnosticsPublisherIntf,
  ) {}

  /**
   * Register a command to run pylint against entire workspace.
   * Displays a notification for duration of process.
   * @returns {vscode.Disposable} command resource
   */
  public register(): vscode.Disposable {
    const start = () => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "PylintStatic: running on whole workspace",
          cancellable: true,
        },
        this.registerHelper.bind(this),
      );
    };
    return this.ext.registerCommand(RunWholeWorkspaceCommand.id, start);
  }

  /**
   * Spawns a `pylint` process, sending its output to output parser task.
   * Handles cancellation through UI event.
   * @param {vscode.Progress} progress
   * @param {vscode.CancellationToken} token
   * @returns {Promise<void>}
   */
  public async registerHelper(
    progress: vscode.Progress<{ increment: number; message?: string }>,
    token: vscode.CancellationToken,
  ): Promise<void> {
    console.log(this.ext);
    progress.report({ increment: 0 });
    var folder: vscode.WorkspaceFolder;

    try {
      folder = this.ext.getWorkspaceFolder();
    } catch (e) {
      await this.ext.showErrorMessage(
        ConstantsClass.displayErrorWorkspaceFolderUndefined,
      );
      return;
    }

    // Clear existing diagnostics
    this.diagnosticsManager.clear();

    const spawnInfo = await this.taskFactory.createSpawn(folder);
    const pylintGateway = new PylintGateway(
      this.diagnosticsManager, // more like a sink
      this.ext,
      this.taskFactory.handle.bind(this.taskFactory),
      spawnInfo.cwd,
      spawnInfo.command,
      ...spawnInfo.args,
    );

    try {
      await pylintGateway.execute(token);
    } catch (e) {
      // ignore execution errors here; PylintGateway logs them
    }
  }
}
