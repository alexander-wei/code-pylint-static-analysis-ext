import { Disposable } from "vscode";

/**
 * VsCode Command (Plugin) Interface
 */
interface CommandIntf {
  register(): Disposable;
}

export default CommandIntf;
