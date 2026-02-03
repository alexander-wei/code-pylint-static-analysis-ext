import { ExtensionContext } from "vscode";

import VsCodeExtensionContext from "./infrastructure/extension/ExtensionContextImpl";
import Extension from "./infrastructure/extension/Extension";

export function activate(context: ExtensionContext) {
  const ext = new VsCodeExtensionContext(context);
  new Extension(ext).activate();
}

export function deactivate() {}
