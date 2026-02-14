import * as path from "path";
import * as vscode from "vscode";

import PylintWrappedTask from "src/pylintstatic/application/parsing/PylintWrappedTask";

import DiagnosticsPublisherIntf from "src/pylintstatic/diagnostics/DiagnosticsPublisherIntf";
import PylintGateway from "src/pylintstatic/infrastructure/pylint/PylintGateway";
import ExtensionContextIntf from "#PylintWrapper/vscodeextension/ExtensionContextIntf";

import CommandIntf from "./CommandIntf";
import { ConstantsClass } from "src/pylintstatic/vscodeextension";

export default class RunResourceCommand implements CommandIntf {
  public static readonly id =
    `${ConstantsClass.appName}.${ConstantsClass.commandRunResourceId}` as const;

  public constructor(
    private readonly ext: ExtensionContextIntf,
    private readonly taskFactory: PylintWrappedTask,
    private readonly diagnosticsManager: DiagnosticsPublisherIntf,
  ) {}

  /**
   * Register a command to run pylint against a resource selected through file explorer.
   * Displays a notification for duration of process.
   * @returns {vscode.Disposable} command resource
   */
  public register(): vscode.Disposable {
    const callback = (resource: vscode.Uri | undefined) => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `PylintStatic: running on resource: ${resource?.path}`,
          cancellable: true,
        },
        (progress, token) => this.registerHelper(progress, token, resource),
      );
    };
    return this.ext.registerCommand(RunResourceCommand.id, callback);
  }

  /**
   * Spawns a `pylint` process, sending its output to output parser task.
   * Handles cancellation through UI event.
   * @param {vscode.Progress} progress
   * @param {vscode.CancellationToken} token
   * @param {vscode.Uri | undefined} resource - target passed to pylint
   * @returns {Promise<void>}
   */
  private async registerHelper(
    progress: vscode.Progress<{ increment: number; message?: string }>,
    token: vscode.CancellationToken,
    resource: vscode.Uri | undefined,
  ): Promise<void> {
    progress.report({ increment: 0 });

    if (!resource) {
      await this.ext.showErrorMessage(
        ConstantsClass.displayErrorResourceUndefined,
      );
      return;
    }

    let folder: vscode.WorkspaceFolder;
    try {
      folder = this.ext.getWorkspaceFolder();
    } catch (e) {
      await this.ext.showErrorMessage("Open a workspace folder first.");
      return;
    }

    // Clear existing diagnostics
    this.diagnosticsManager.clearUriMatch(new RegExp(resource.path));

    // Compute target relative to workspace folder so PylintWrappedTask can
    // produce the correct command/args.
    const abs = resource.fsPath;
    const rel = path.isAbsolute(abs)
      ? path.relative(folder.uri.fsPath, abs)
      : abs;

    const spawnInfo = await this.taskFactory.createSpawn(folder, rel || ".");

    const pylintGateway = new PylintGateway(
      this.diagnosticsManager,
      this.ext,
      this.taskFactory.handle.bind(this.taskFactory),
      spawnInfo.cwd,
      spawnInfo.command,
      ...spawnInfo.args,
    );

    try {
      await pylintGateway.execute(token);
    } catch (e) {
      // PylintGateway logs execution errors; no further action required here.
    }
  }
}
