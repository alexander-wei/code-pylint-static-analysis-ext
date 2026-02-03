import * as vscode from "vscode";
import { Builder } from "builder-pattern";

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
   * Main entry point.
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

  // ------------------------
  // Internals
  // ------------------------

  private get folderUri(): vscode.Uri | undefined {
    return this.folder?.uri;
  }

  private getExtensionOverride(): string | undefined {
    const cfg = vscode.workspace.getConfiguration(
      this.extensionConfigSection,
      this.folderUri,
    );

    const override = (cfg.get<string>(this.overrideSettingKey) || "").trim();
    return override || undefined;
  }

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

  private static PythonInterpreterBuilder() {
    return Builder(PythonInterpreter);
  }

  static async resolvePythonInterpreter(
    folder?: vscode.WorkspaceFolder,
  ): Promise<string> {
    return PythonInterpreter.PythonInterpreterBuilder()
      .folder(folder)
      .build()
      .resolve();
  }
}
