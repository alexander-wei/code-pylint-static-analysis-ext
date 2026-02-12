import * as path from "path";
import { existsSync } from "fs";

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

class Extension {
  /**
   * Constructor
   * @param {ExtensionContextIntf} ext - VsCode Extension Context
   */
  public constructor(private readonly ext: ExtensionContextIntf) {}

  /**
   * Resolves LspServer.js path
   * @param {string[]} candidates - paths to check
   * @returns {string} path to existing LspServer.js
   * @throws {Error} if no LspServer.js is found
   */
  private static firstExisting(...candidates: string[]): string {
    for (const p of candidates) {
      if (existsSync(p)) {
        return p;
      }
    }
    throw new Error(ConstantsClass.displayLspModuleNotFound(...candidates));
  }

  /**
   * Entrypoint
   * Composes 1. LspServer
   * 2. Diagnostics publisher
   * 3. Pylint task factory
   * 4. Commands
   */
  public activate(): void {
    const settingsReader = new PylintWrappedSettingsReader(this.ext);

    const serverModule = Extension.firstExisting(
      this.ext.asAbsolutePath(path.join("dist", ConstantsClass.lspServerPath)), // esbuild
      this.ext.asAbsolutePath(
        path.join("out/src/pylintstatic", ConstantsClass.lspServerPath),
      ), // tsc build
    );
    // Start language client/server used to publish diagnostics via LSP
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
