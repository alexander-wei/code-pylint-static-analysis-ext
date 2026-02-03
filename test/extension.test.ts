/**
 * Extension activates & registers commandRunWholeWorkspace
 */

import * as assert from "assert";
import * as vscode from "vscode";

import * as myExtension from "src/pylintstatic/activate";
import { ConstantsClass } from "src/pylintstatic/vscodeextension";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("extension activates and registers command", async () => {
    // Call the extension's activate() with a mock context to ensure registration
    const ctx: any = { subscriptions: [] };
    await myExtension.activate(ctx as vscode.ExtensionContext);

    const commands = await vscode.commands.getCommands(true);
    // Command should be registered
    assert.ok(
      commands.includes(
        `${ConstantsClass.appName}.${ConstantsClass.commandRunWholeWorkspaceId}`,
      ),
    );
  });
});
