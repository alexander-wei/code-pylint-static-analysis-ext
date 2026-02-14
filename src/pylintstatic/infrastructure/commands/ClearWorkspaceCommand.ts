import { Disposable } from "vscode";

import { DiagnosticsPublisherIntf } from "#PylintWrapper/diagnostics";

import {
  ConstantsClass,
  ExtensionContextIntf,
} from "#PylintWrapper/vscodeextension";

import CommandIntf from "./CommandIntf";

/**
 * Command clears all registered diagnostics to reset Problems UI
 */
export default class ClearWorkspaceCommand implements CommandIntf {
  public static readonly id =
    `${ConstantsClass.appName}.${ConstantsClass.commandClearWorkspaceId}` as const;

  public constructor(
    private readonly ext: ExtensionContextIntf,
    private readonly diagnostics: DiagnosticsPublisherIntf,
  ) {}

  public register(): Disposable {
    return this.ext.registerCommand(
      ClearWorkspaceCommand.id,
      this.registerHelper.bind(this),
    );
  }

  private registerHelper(): void {
    this.diagnostics.clear();
    this.diagnostics.flush();
  }
}
