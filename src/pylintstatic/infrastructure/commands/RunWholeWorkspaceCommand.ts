import * as vscode from "vscode";
import PylintWrappedTask from "../../application/parsing/PylintWrappedTask";
// import { DiagnosticsManager } from "../infrastructure/DiagnosticsManager";
import DiagnosticsPublisherIntf from "../../diagnostics/DiagnosticsPublisherIntf";
import ExtensionContextIntf from "#PylintWrapper/vscodeextension/ExtensionContextIntf";

import PylintGateway from "src/pylintstatic/infrastructure/pylint/PylintGateway";
import CommandIntf from "./CommandIntf";
import { ConstantsClass } from "src/pylintstatic/vscodeextension";
// Application

/**
 * In Domain-Driven Design (DDD), folder dependencies follow a strict inward-pointing rule: outer layers depend on inner layers, with the
Domain at the center. The core dependency chain is Infrastructure → Application → Domain, ensuring business logic remains isolated from technical details. 
Here is a breakdown of the typical DDD folder dependencies:

    Domain Layer (Core/Domain): This is the innermost folder and depends on nothing. It contains entities, value objects, domain events, and repository interfaces.
    Application Layer (Services/Use Cases): Depends only on the Domain folder. It orchestrates domain objects to fulfill use cases and depends on repository interfaces (not implementations).
    Infrastructure Layer (Persistence/API): Depends on both Domain and Application. It implements the technical details, such as database repositories, external API clients, and configuration.
    Interfaces Layer (UI/API Controllers): Depends on the Application layer to trigger use cases. 

Key Principles:

    No Cycles: Domain never depends on Application or Infrastructure.
    Shared Kernel: A Shared or Common folder may exist, which other modules can depend on, but it should not depend on them.
    Bounded Contexts: Each Bounded Context (folder) should be independent, with dependencies minimized between different context folders. 

Example Hierarchy (from most to least dependent):
src/
infrastructure/ -> depends on domain, application
application/ -> depends on domain
domain/ -> depends on nothing
shared/ 
 */

export default class RunWholeWorkspaceCommand implements CommandIntf {
  /**
   * TODO: this needs to be singleton
   * When a command is started before a previous one finishes, diagnostics appear as duplicates.
   * Clearing is handled only at beginning right  now.
   */
  public static readonly id =
    `${ConstantsClass.appName}.${ConstantsClass.commandRunWholeWorkspaceId}` as const;

  public constructor(
    private readonly ext: ExtensionContextIntf,
    private readonly taskFactory: PylintWrappedTask,
    private readonly diagnosticsManager: DiagnosticsPublisherIntf,
  ) {}

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

    // Keep existing registration for command palette. Additionally, when
    // invoked programmatically we want the command to remain compatible.
    return this.ext.registerCommand(RunWholeWorkspaceCommand.id, start);
  }

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

  private handleLine(line: string, folder: vscode.WorkspaceFolder) {
    const json = JSON.parse(line.replace("__PYLINT_ISSUE__ ", ""));
    // register diagnostic immediately
    console.log("[extension] parsed issue:", json);
    this.diagnosticsManager.addIssue(json, folder as any);
  }
}
