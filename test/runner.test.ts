import * as assert from "assert";
import IssueImpl from "src/pylintstatic/application/parsing/IssueImpl";

import { PylintWrappedTask } from "src/pylintstatic/application";

suite("Runner.issue parsing", () => {
  test("parses single-line standard format", () => {
    const line = "file.py:10:5: W0123: Example message\n";
    const issue = IssueImpl.fromLine(
      line,
      PylintWrappedTask.PATT,
      PylintWrappedTask.PATT_ALT,
    );
    assert.ok(issue);
    assert.strictEqual(issue!.file, "file.py");
    assert.strictEqual(issue!.line, 10);
    assert.strictEqual(issue!.column, 5);
    assert.strictEqual(issue!.category, "W");
  });

  test("parses alternate format without column and with code in brackets", () => {
    const line = "path/to/file.py:1:0: R0801: Similar lines in 2 files\n";
    const issue = IssueImpl.fromLine(
      line,
      PylintWrappedTask.PATT,
      PylintWrappedTask.PATT_ALT,
    );
    issue?.appendContinuation(" ==a.tests∶[107∶113]\n");
    issue?.appendContinuation(" ==b.tests∶[50∶56]\n");
    assert.ok(issue);
    assert.strictEqual(issue!.file, "path/to/file.py");
    assert.strictEqual(issue!.line, 1);
    assert.strictEqual(issue!.column, 0);
    assert.strictEqual(issue!.category, "I");
    assert.strictEqual(issue!.code, "0801");
  });

  test("toJSON includes expected fields", () => {
    const line = "file.py:2:3: E999: Crash\n";
    const issue = IssueImpl.fromLine(
      line,
      PylintWrappedTask.PATT,
      PylintWrappedTask.PATT_ALT,
    );
    assert.ok(issue);
    const json = issue!.toJSON();
    assert.strictEqual(json.file, "file.py");
    assert.strictEqual(json.line, 2);
    assert.strictEqual(json.column, 3);
    assert.strictEqual(json.category, "E");
  });
});
