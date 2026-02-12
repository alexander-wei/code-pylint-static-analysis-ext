export default class ConstantsClass {
  static readonly appName = "pylintStatic";

  static readonly diagnosticCollectionName = "pylintStatic";
  static readonly lspServerPath = "infrastructure/lsp/LspServer.js";

  /* settings.json: named parameters */
  static readonly cfgGetPylintPath = "pylintPath";
  static readonly cfgGetUsePythonModule = "usePythonModule";
  static readonly cfgGetEnableAll = "enableAll";
  static readonly cfgGetRecursive = "recursive";
  static readonly cfgGetExtraArgs = "extraArgs";

  static readonly commandRunWholeWorkspaceId = "runWholeWorkspace";
  static readonly commandRunResourceId = "runResource";
  static readonly commandClearWorkspaceId = "clearWorkspace";

  static readonly displayErrorWorkspaceFolderUndefined =
    "Open a workspace folder first.";

  static readonly displayErrorResourceUndefined =
    "Select a file or folder in the explorer first.";

  static displayLspModuleNotFound(...candidates: string[]) {
    return `LSP server module not found. Tried:\n${candidates.join("\n")}`;
  }

  private constructor() {}
}
