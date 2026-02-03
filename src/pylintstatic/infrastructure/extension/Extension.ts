/** -----------------------------
 *  Command(s)
 *  ----------------------------- */

import * as path from "path";
import { TransportKind } from "vscode-languageclient/node";

import {
  ConstantsClass,
  ExtensionContextIntf,
} from "src/pylintstatic/vscodeextension";

import {
  ClearWorkspaceCommand,
  CommandIntf,
  RunResourceCommand,
  RunWholeWorkspaceCommand,
} from "../commands";

import {
  DiagnosticsManager,
  PylintWrappedSettingsReader,
  PylintWrappedTask,
} from "src/pylintstatic/application";

import LspClient from "../lsp/LspClient";

/** -----------------------------
 *  Composition root
 *  ----------------------------- */

class Extension {
  public constructor(private readonly ext: ExtensionContextIntf) {}

  public activate(): void {
    // const runnerJsPath = path.join(__dirname, "runner.js");

    const settingsReader = new PylintWrappedSettingsReader(this.ext);

    // Start language client/server used to publish diagnostics via LSP
    const serverModule = path.join(__dirname, ConstantsClass.lspServerPath);
    const serverOptions = {
      run: { module: serverModule, transport: TransportKind.ipc },
      debug: { module: serverModule, transport: TransportKind.ipc },
    } as any;

    const clientOptions = {
      documentSelector: [{ scheme: "file", language: "python" }],
      diagnosticCollectionName: ConstantsClass.diagnosticCollectionName,
    } as any;

    let lspClient = new LspClient(clientOptions, serverOptions);

    lspClient.start();

    const diagnostics = new DiagnosticsManager(
      lspClient.reporter.bind(lspClient),
      lspClient.reporterStream.bind(lspClient),
    );
    const taskFactory = new PylintWrappedTask(
      this.ext,
      settingsReader,
      diagnostics,
    );

    this.ext.subscriptions.push(diagnostics);

    const registerCmd: Array<CommandIntf> = [
      new RunWholeWorkspaceCommand(this.ext, taskFactory, diagnostics),
      new RunResourceCommand(this.ext, taskFactory, diagnostics),
      new ClearWorkspaceCommand(this.ext, diagnostics),
    ];
    registerCmd.forEach((cmd) => {
      cmd.register();
    });
  }
}

export default Extension;
