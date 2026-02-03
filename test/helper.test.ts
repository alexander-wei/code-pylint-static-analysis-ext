/**
 * Resolves a default python interpreter path
 */

import * as assert from "assert";
import * as vscode from "vscode";
import PythonInterpreter from "src/pylintstatic/infrastructure/pylint/PythonInterpreter";

suite("Helper.PythonInterpreter.resolvePythonInterpreter", () => {
  let origGetConfig: any;
  let origGetExtension: any;

  setup(() => {
    origGetConfig = (vscode.workspace as any).getConfiguration;
    origGetExtension = (vscode.extensions as any).getExtension;
  });

  teardown(() => {
    (vscode.workspace as any).getConfiguration = origGetConfig;
    (vscode.extensions as any).getExtension = origGetExtension;
  });

  test("returns explicit override from pylintWrapped.pythonPath", async () => {
    (vscode.workspace as any).getConfiguration = (section: string) => ({
      get: (k: string, d?: any) => {
        if (section === "pylintWrapped" && k === "pythonPath") {
          return "/custom/python";
        }
        return d;
      },
    });

    const p = await PythonInterpreter.resolvePythonInterpreter();
    assert.strictEqual(p, "/custom/python");
  });

  test("uses python extension API when available", async () => {
    (vscode.workspace as any).getConfiguration = (section: string) => ({
      get: (_k: string, d?: any) => d ?? "",
    });

    (vscode.extensions as any).getExtension = (id: string) => {
      if (id === "ms-python.python") {
        return {
          activate: async () => ({
            environments: {
              getActiveEnvironment: async (_uri?: any) => ({
                executable: { uri: { fsPath: "/pyext/python" } },
              }),
            },
          }),
        } as any;
      }
      return undefined;
    };

    const p = await PythonInterpreter.resolvePythonInterpreter();
    assert.strictEqual(p, "/pyext/python");
  });

  test("falls back to python.defaultInterpreterPath and then python3", async () => {
    (vscode.workspace as any).getConfiguration = (section: string) => ({
      get: (k: string, d?: any) => {
        if (section === "python" && k === "defaultInterpreterPath") {
          return "/from/pythoncfg";
        }
        return "";
      },
    });
    (vscode.extensions as any).getExtension = () => undefined;

    const p1 = await PythonInterpreter.resolvePythonInterpreter();
    assert.strictEqual(p1, "/from/pythoncfg");

    // Now ensure last-resort fallback
    (vscode.workspace as any).getConfiguration = (_section: string) => ({
      get: () => "",
    });
    const p2 = await PythonInterpreter.resolvePythonInterpreter();
    assert.strictEqual(p2, "python3");
  });
});
