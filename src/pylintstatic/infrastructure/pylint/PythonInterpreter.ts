import * as vscode from "vscode";
import { Builder, IBuilder } from "builder-pattern";

/**
 * Resolves the Python interpreter path for this extension.
 *
 * Resolution order:
 *  1) Extension setting override: pylintWrapped.pythonPath
 *  2) VS Code Python extension API (ms-python.python)
 *  3) VS Code Python setting: python.defaultInterpreterPath
 *  4) Fallback: python3
 */
export default class PythonInterpreter {
  // Builder-set fields
  public folder?: vscode.WorkspaceFolder;

  // Optional: let tests override these (or make them constructor params)
  public extensionId: string = "ms-python.python";
  public extensionConfigSection: string = "pylintWrapped";
  public pythonConfigSection: string = "python";
  public overrideSettingKey: string = "pythonPath";
  public defaultInterpreterSettingKey: string = "defaultInterpreterPath";
  public lastResort: string = "python3";

  /**
   * Resolve the path to python interpreter, depending on user settings
   */
  public async resolve(): Promise<string> {
    // 1) Explicit override (extension setting)
    const override = this.getExtensionOverride();
    if (override) {
      return override;
    }

    // 2) Python extension API (preferred)
    const fromPythonExt = await this.tryPythonExtensionApi();
    if (fromPythonExt) {
      return fromPythonExt;
    }

    // 3) VS Code python setting fallback
    const fromVscodePythonSetting =
      this.getVscodePythonDefaultInterpreterPath();
    if (fromVscodePythonSetting) {
      return fromVscodePythonSetting;
    }

    // 4) Last resort
    return this.lastResort;
  }

  /**
   * Get handle to user's workspace folder
   */
  private get folderUri(): vscode.Uri | undefined {
    return this.folder?.uri;
  }

  /**
   * Get user settings that would override default resolution order
   * @returns {string | undefined}
   */
  private getExtensionOverride(): string | undefined {
    const cfg = vscode.workspace.getConfiguration(
      this.extensionConfigSection,
      this.folderUri,
    );

    const override = (cfg.get<string>(this.overrideSettingKey) || "").trim();
    return override || undefined;
  }

  /**
   * Get the user's default python interpreter path; global, not specific to this extension's settings
   * @returns {string | undefined}
   */
  private getVscodePythonDefaultInterpreterPath(): string | undefined {
    const pythonCfg = vscode.workspace.getConfiguration(
      this.pythonConfigSection,
      this.folderUri,
    );

    const p = (
      pythonCfg.get<string>(this.defaultInterpreterSettingKey) || ""
    ).trim();
    return p || undefined;
  }

  /**
   * Attempts to resolve the interpreter via the ms-python.python extension API.
   * Handles multiple API shapes across versions.
   */
  private async tryPythonExtensionApi(): Promise<string | undefined> {
    const pyExt = vscode.extensions.getExtension(this.extensionId);
    if (!pyExt) {
      return undefined;
    }

    try {
      const api = await pyExt.activate();
      const envs = api?.environments;

      // Variant 1: envs.getActiveEnvironment(folderUri) -> environment object
      if (envs?.getActiveEnvironment) {
        const env = await envs.getActiveEnvironment(this.folderUri);
        const p = env?.executable?.uri?.fsPath;
        if (p) {
          return p;
        }
      }

      // Variant 2: envs.getActiveEnvironmentPath(folderUri) -> string or { path: string }
      if (envs?.getActiveEnvironmentPath) {
        const envPath = envs.getActiveEnvironmentPath(this.folderUri);
        const p = typeof envPath === "string" ? envPath : envPath?.path;
        if (p) {
          return p;
        }
      }

      return undefined;
    } catch {
      // Ignore and fall through
      return undefined;
    }
  }

  /**
   * Builder Api
   * @returns {IBuilder<PythonInterpreter>}
   */
  private static PythonInterpreterBuilder() {
    return Builder(PythonInterpreter);
  }

  /**
   * Resolves the python interpreter from user's workspace folder
   * @param {vscode.WorkspaceFolder} folder
   * @returns {Promise<string>} path to python interpreter
   */
  static async resolvePythonInterpreter(
    folder?: vscode.WorkspaceFolder,
  ): Promise<string> {
    return PythonInterpreter.PythonInterpreterBuilder()
      .folder(folder)
      .build()
      .resolve();
  }
}
