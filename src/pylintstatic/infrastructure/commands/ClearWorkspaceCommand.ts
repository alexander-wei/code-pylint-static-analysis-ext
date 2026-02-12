import DiagnosticsPublisherIntf from "src/pylintstatic/diagnostics/DiagnosticsPublisherIntf";
import ExtensionContextIntf from "#PylintWrapper/vscodeextension/ExtensionContextIntf";
import { Disposable } from "vscode";
import CommandIntf from "./CommandIntf";
import { ConstantsClass } from "src/pylintstatic/vscodeextension";

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
