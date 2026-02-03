import { Disposable } from "vscode";

interface CommandIntf {
  register(): Disposable;
}

export default CommandIntf;
