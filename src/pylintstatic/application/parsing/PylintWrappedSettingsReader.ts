import { WorkspaceFolder } from "vscode";

import {
  ExtensionContextIntf,
  PylintWrappedSettings,
} from "src/pylintstatic/vscodeextension";

import ConstantsClass from "src/pylintstatic/vscodeextension/ConstantsClass";

/**
 * User settings reader
 *
 * Retrieves extension settings (.vscode/settings.json) for this extension
 * that are relevant to the execution of
 *  `/path/to/pylint *args **kwargs`
 */
export default class PylintWrappedSettingsReader {
  /**
   * Construct the settings reader from Extension context
   * @param {ExtensionContextIntf} ext - VsCode extension context
   */
  public constructor(private readonly ext: ExtensionContextIntf) {}

  /**
   * Read user settings. Return JSON object containing user settings relevant
   * to execution of the `pylint` process.
   * @param {WorkspaceFolder} folder - current workspace folder
   * @returns {PylintWrappedSettings} JSON object containing user settings
   */
  public read(folder: WorkspaceFolder): PylintWrappedSettings {
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
