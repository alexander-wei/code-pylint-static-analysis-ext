import { ConstantsClass } from "src/pylintstatic/vscodeextension";
import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

suite("E2E: Diagnostics via LSP", function () {
  this.timeout(60000);

  test("publishes diagnostics and they appear in Problems UI", async () => {
    // Create a temporary workspace folder
    await baseTest();
  });
  test("clears diagnostics", async () => {
    const { uri, initialLen } = await baseTest(); // <-- return the actual URI used
    assert.ok(initialLen > 0);

    await vscode.commands.executeCommand(
      `${ConstantsClass.appName}.${ConstantsClass.commandClearWorkspaceId}`,
    );

    await waitForDiagnosticsChange(uri, (d) => d.length === 0);

    assert.strictEqual(vscode.languages.getDiagnostics(uri).length, 0);
  });
});

async function baseTest(): Promise<{ uri: vscode.Uri; initialLen: number }> {
  const tmp = path.join(__dirname, "tmp-workspace");
  if (!fs.existsSync(tmp)) {
    fs.mkdirSync(tmp, { recursive: true });
  }

  const filePath = path.join(tmp, "bad.py");
  // Insert a simple line that pylint will complain about (unused var)
  fs.writeFileSync(filePath, "def foo():\n    x = 1\n", "utf8");

  const uri = vscode.Uri.file(filePath);
  // Open folder as workspace for the test host
  await vscode.commands.executeCommand(
    "vscode.openFolder",
    vscode.Uri.file(tmp),
    true,
  );

  // Ensure command is available and avoid duplicate activation by
  // waiting briefly for extension activation to finish.
  await new Promise((r) => setTimeout(r, 500));
  // Run the extension command that triggers the lint run
  await vscode.commands.executeCommand(
    `${ConstantsClass.appName}.${ConstantsClass.commandRunWholeWorkspaceId}`,
  );

  // Wait up to 10s for diagnostics to appear
  const start = Date.now();
  let diags: vscode.Diagnostic[] = [];

  var diagsLength: number = 0;

  while (Date.now() - start < 10000) {
    diags = vscode.languages.getDiagnostics(uri) || [];
    // debug output for CI logs
    console.log("[e2e-test] diagnostics count:", diags.length);
    if (diags.length > 0) {
      diagsLength = diags.length;
      console.log(
        JSON.stringify(
          diags.map((d) => ({
            message: d.message,
            code: (d as any).code || d.code,
          })),
        ),
        null,
        2,
      );
    }
    if (diags.length > 0) {
      break;
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  assert.ok(diags.length > 0, "Expected diagnostics for bad.py");

  // Look for codeDescription / code link on at least one diagnostic
  const hasCodeDescription = diags.some(
    (d) => (d as any).codeDescription || (d.code && typeof d.code === "object"),
  );
  assert.ok(
    hasCodeDescription,
    "Expected at least one diagnostic with codeDescription or link-like code",
  );

  return { uri, initialLen: vscode.languages.getDiagnostics(uri).length };
}

async function waitForDiagnosticsChange(
  uri: vscode.Uri,
  predicate: (diags: readonly vscode.Diagnostic[]) => boolean,
  timeoutMs = 10_000,
) {
  const start = Date.now();

  // Fast-path: already satisfied
  if (predicate(vscode.languages.getDiagnostics(uri))) return;

  await new Promise<void>((resolve, reject) => {
    const timer = setInterval(() => {
      if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        sub.dispose();
        reject(new Error("Timed out waiting for diagnostics change"));
      }
    }, 50);

    const sub = vscode.languages.onDidChangeDiagnostics((e) => {
      // Only wake up when the URI we care about is among the changed ones
      if (!e.uris.some((u) => u.toString() === uri.toString())) return;

      const diags = vscode.languages.getDiagnostics(uri);
      if (predicate(diags)) {
        clearInterval(timer);
        sub.dispose();
        resolve();
      }
    });
  });
}
