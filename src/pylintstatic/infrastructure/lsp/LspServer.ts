import {
  createConnection,
  ProposedFeatures,
  Diagnostic as LspDiagnostic,
  DiagnosticSeverity as LspDiagnosticSeverity,
  InitializeParams,
} from "vscode-languageserver/node";

import IssueIntf from "src/pylintstatic/diagnostics/IssueIntf";
import { URI } from "vscode-uri";

/**
 * LSP server for receiving pylint issues from the client and publishing
 * VS Code diagnostics (with rich codeDescription links)
 */
export class LspServer {
  private readonly connection = createConnection(ProposedFeatures.all as any);

  // Keep per-file diagnostics server-side
  private readonly diagnosticsByFile = new Map<string, LspDiagnostic[]>();

  public start(): void {
    this.registerHandlers();
    this.connection.listen();
  }

  private registerHandlers(): void {
    this.connection.onInitialize(this.onInitialize);

    this.connection.onNotification(
      "pylint/diagnostics",
      (params: { uri: string; issues: IssueIntf[] }) =>
        this.onDiagnostics(params),
    );

    this.connection.onNotification(
      "pylint/diagnostics/clear",
      (params: { uri?: string }) => this.onClearDiagnostics(params),
    );

    this.connection.onRequest(
      "pylint/diagnostics/stream",
      (params: { uri: string; issue: IssueIntf }) => this.onStreamIssue(params),
    );
  }

  private readonly onInitialize = (_params: InitializeParams) => {
    return { capabilities: {} };
  };

  private onDiagnostics(params: { uri: string; issues: IssueIntf[] }): void {
    this.safeLog("[lspServer] received pylint/diagnostics", {
      uri: params.uri,
      count: params.issues.length,
    });

    const { uri, issues } = params;

    // Build a new diagnostics list from the incoming authoritative issues
    const list: LspDiagnostic[] = issues.map((issue) =>
      this.issueToDiagnostic(issue, {
        // Keep same behavior as your current bulk handler:
        // "code" uses numeric code when present, else category.
        codeSelector: "codeOrCategory",
        source: "pylint",
      }),
    );

    // Replace stored diagnostics for this file with the new list
    this.diagnosticsByFile.set(uri, list);

    this.safeLog("[lspServer] sending diagnostics", {
      uri,
      count: list.length,
    });
    this.connection.sendDiagnostics({ uri, diagnostics: list });
  }

  private onClearDiagnostics(params: { uri?: string } | undefined): void {
    if (params?.uri) {
      this.diagnosticsByFile.delete(params.uri);
      this.connection.sendDiagnostics({ uri: params.uri, diagnostics: [] });
      this.safeConsoleLog(`[lspServer] cleared diagnostics for ${params.uri}`);
      return;
    }

    // Clear all: must publish empty diagnostics per file so VS Code removes them.
    for (const [uri] of this.diagnosticsByFile.entries()) {
      try {
        this.connection.sendDiagnostics({ uri, diagnostics: [] });
      } catch {
        // ignore send errors for individual URIs
      }
    }
    this.diagnosticsByFile.clear();
    this.safeConsoleLog("[lspServer] cleared all diagnostics");
  }

  private onStreamIssue(params: { uri: string; issue: IssueIntf }): {
    ok: true;
  } {
    const { uri, issue } = params;

    // Keep same behavior as your current stream handler:
    // "code" prefers codeTag, else category; and source label differs.
    const diag = this.issueToDiagnostic(issue, {
      codeSelector: "codeTagOrCategory",
      source: "Pylint",
    });

    const list = this.diagnosticsByFile.get(uri) ?? [];
    list.push(diag);
    this.diagnosticsByFile.set(uri, list);

    this.connection.sendDiagnostics({ uri, diagnostics: list });
    return { ok: true };
  }

  private issueToDiagnostic(
    issue: IssueIntf,
    opts: {
      codeSelector: "codeOrCategory" | "codeTagOrCategory";
      source: string;
    },
  ): LspDiagnostic {
    const startLine = Math.max(0, (issue.line || 1) - 1);
    const startCol = Math.max(0, (issue.column || 1) - 1);

    const range = {
      start: { line: startLine, character: startCol },
      end: { line: startLine, character: Math.max(startCol + 1, startCol) },
    };

    const severity =
      issue.category === "E"
        ? LspDiagnosticSeverity.Error
        : issue.category === "W"
          ? LspDiagnosticSeverity.Warning
          : LspDiagnosticSeverity.Information;

    const codeVal =
      opts.codeSelector === "codeOrCategory"
        ? issue.code
          ? issue.code.toString()
          : issue.category
        : issue.codeTag
          ? issue.codeTag.toString()
          : issue.category;

    const target = this.pylintDocUrl(issue);

    const diag: LspDiagnostic = {
      range,
      message: issue.message,
      severity,
      code: codeVal,
      source: opts.source,
      // @ts-ignore - codeDescription may not be in all lib versions
      codeDescription: { href: URI.parse(target).toString() },
    } as any;

    return diag;
  }

  private pylintDocUrl(issue: IssueIntf): string {
    // Pylint docs use per-category paths like:
    // https://pylint.readthedocs.io/en/latest/user_guide/messages/<category>/<codeTag>.html
    const categoryMap: Record<string, string> = {
      E: "error",
      W: "warning",
      C: "convention",
      R: "refactor",
      I: "information",
    };

    const baseUserDocs =
      "https://pylint.readthedocs.io/en/latest/user_guide/messages";
    const baseTechnical =
      "https://pylint.readthedocs.io/en/latest/technical_reference/messages/messages.html";

    // Prefer explicit codeTag + originalCategory (raw single-letter) when available
    const origCat = (issue as any).originalCategory || issue.category;
    const categoryName =
      categoryMap[origCat] || categoryMap[issue.category] || "";

    if (issue.codeTag && categoryName) {
      return `${baseUserDocs}/${categoryName}/${issue.codeTag}.html`;
    }
    if (issue.code) {
      return `${baseTechnical}#${issue.code.trim()}`;
    }
    return baseTechnical;
  }

  private safeConsoleLog(msg: string): void {
    try {
      this.connection.console.log(msg);
    } catch {
      // ignore console transport errors
    }
  }

  private safeLog(msg: string, obj: unknown): void {
    // Keep your current behavior: log both to stdout and to connection.console when possible.
    try {
      console.log(msg, obj);
    } catch {
      // ignore stdout errors
    }

    try {
      this.connection.console.log(
        typeof obj === "string"
          ? `${msg} ${obj}`
          : `${msg} ${JSON.stringify(obj)}`,
      );
    } catch {
      // ignore
    }
  }
}

// bootstrap (still in the same file)
new LspServer().start();
