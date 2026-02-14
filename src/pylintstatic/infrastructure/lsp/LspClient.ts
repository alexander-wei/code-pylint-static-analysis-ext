import { LanguageClient } from "vscode-languageclient/node";
import { LspClientOptions } from "./LspClientOptions";
import { LspServerOptions } from "./LspServerOptions";
import IssueIntf from "src/pylintstatic/diagnostics/IssueIntf";

/**
 * LspClient resource. Handles incoming diagnostic messages so that they are registered by VsCode as
 * LSP diagnostic objects and displayed in the Problems UI.
 */
export default class LspClient {
  private client: LanguageClient;

  /**
   * Client readiness state; diagnostics are not pushed unless true.
   */
  private clientReady: boolean | undefined;

  /**
   * Handle to LanguageClient callback. Operations are chained through updating this handle.
   */
  private startPromise: Promise<void> | undefined;

  /**
   * Constructor
   * @param {LspClientOptions} clientOptions
   * @param {LspServerOptions} serverOptions
   */
  constructor(
    clientOptions: LspClientOptions,
    serverOptions: LspServerOptions,
  ) {
    this.client = new LanguageClient(
      "pylintWrappedClient",
      "Pylint Wrapped Client",
      serverOptions,
      clientOptions,
    );
  }

  /**
   * Start the LspClient and its complementary LspServer
   */
  public start(): void {
    console.log("[extension] starting language client");
    this.startPromise = this.client.start();
    this.startPromise = this.startPromise.then(this.setClientReady.bind(this));
    this.startPromise = this.startPromise.catch(
      this.catchClientReady.bind(this),
    );
  }

  /**
   * Set client readiness to true.
   */
  private setClientReady(): void {
    this.clientReady = true;
    console.log("[extension] language client started — clientReady=true");
  }

  /**
   * Handle errors by emitting log message.
   * @param {any} err
   */
  private catchClientReady(err: any): void {
    console.log("[extension] language client failed to start", err);
  }

  /**
   * Push a single diagnostic to the language server.
   * @param p - translated diagnostic object
   * @returns {Promise<void>}
   */
  public async reporterStream(p: {
    uri: string;
    issue: IssueIntf;
  }): Promise<void> {
    const maxAttempts = 4;
    let attempt = 0;
    let lastErr: any;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // If the client isn't started yet, wait for it (bounded)
    if (this.startPromise && !this.clientReady) {
      try {
        await Promise.race([
          this.startPromise,
          new Promise((_, rej) =>
            setTimeout(() => rej(new Error("client start timeout")), 5000),
          ),
        ]);
      } catch (e) {
        // fall through to retry logic which will attempt once client is available
      }
    }

    // Do not send a per-issue global clear here — clearing should be
    // performed deterministically once at the start of a run via
    // DiagnosticsManager.clear(). Sending a clear per-issue caused
    // a race where some streamed diagnostics would be wiped.

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        if (!this.client) {
          throw new Error("no language this.client");
        }
        // sendRequest returns a promise; use the request form for an acknowledged call
        await (this.client as any).sendRequest("pylint/diagnostics/stream", p);
        return;
      } catch (err) {
        lastErr = err;
        // exponential backoff
        const delay = 100 * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
    console.log("[extension] reporterStream failed after retries", lastErr);
  }

  /**
   * Forcefully push diagnostics to language server.
   * @param params - translated diagnostics object
   */
  public async reporter(params: any): Promise<void> {
    try {
      console.log(
        "[extension] sending pylint/diagnostics",
        params.uri,
        params.issues.length,
      );
      // Only send immediately if the client is ready. Otherwise the
      // DiagnosticsManager.flush() will re-send once startPromise
      // resolves. This avoids losing notifications sent before the
      // language client/server handshake is finished.
      // Always send to LSP for debugging; rely on server logs to show
      // whether notifications are received. This disables the local
      // fallback reporter so we can confirm LSP-only path.
      try {
        console.log(
          "[extension] forcing send to LSP",
          params.uri,
          params.issues.length,
        );
        this.client?.sendNotification("pylint/diagnostics", params);
      } catch (e) {
        console.log("[extension] sendNotification error", e);
      }
    } catch (e) {
      // ignore if client not ready
    }
  }
}
