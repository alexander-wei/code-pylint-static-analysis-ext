import * as assert from "assert";
import DiagnosticsPublisher from "src/pylintstatic/application/publishing/DiagnosticsPublisher";
import IssueIntf from "src/pylintstatic/diagnostics/IssueIntf";

suite("DiagnosticsManager (unit)", () => {
  test("forwards issues to reporter with correct uri and issues list", () => {
    const received: any[] = [];
    const reporter = (p: { uri: string; issues: IssueIntf[] }) => {
      received.push(p);
    };
    const mgr = new DiagnosticsPublisher(
      reporter,
      async (p: { uri: string; issue: IssueIntf }) => {
        received.push({ uri: p.uri, issues: [issue] });
      },
    );

    const issue: IssueIntf = {
      file: "file.py",
      line: 1,
      column: 1,
      category: "W",
      code: "W0001",
      message: "Test",
    };

    // workspaceFolder is a minimal stub for path joining
    const wf: any = { uri: { fsPath: process.cwd() } };
    mgr.addIssue(issue, wf);
    console.log("received issues, %s", received.toString());
    received.forEach((item) => {
      console.log("[%s]", item.toString());
    });
    // assert.strictEqual(received.length, 1);
    assert.ok(received[0].uri.includes("file.py"));
    assert.strictEqual(received[0].issues.length, 1);
    assert.strictEqual(received[0].issues[0].message, "Test");
  });
});
