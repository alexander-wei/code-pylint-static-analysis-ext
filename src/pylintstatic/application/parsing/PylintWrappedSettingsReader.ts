import {
  ExtensionContextIntf,
  PylintWrappedSettings,
} from "src/pylintstatic/vscodeextension";

import ConstantsClass from "src/pylintstatic/vscodeextension/ConstantsClass";

import * as vscode from "vscode";

export default class PylintWrappedSettingsReader {
  public constructor(private readonly ext: ExtensionContextIntf) {}

  public read(folder: vscode.WorkspaceFolder): PylintWrappedSettings {
    const cfg = this.ext.getConfiguration(ConstantsClass.appName, folder.uri);

    return {
      pylintPath: cfg.get<string>(ConstantsClass.cfgGetPylintPath, "pylint"),
      usePythonModule: cfg.get<boolean>(
        ConstantsClass.cfgGetUsePythonModule,
        true,
      ),
      enableAll: cfg.get<boolean>(ConstantsClass.cfgGetEnableAll, true),
      recursive: cfg.get<boolean>(ConstantsClass.cfgGetRecursive, true),
      extraArgs: cfg.get<string[]>(ConstantsClass.cfgGetExtraArgs, []) ?? [],
    };
  }
}
