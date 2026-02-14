/**
 * Language client configuration; includes collection name identifier for the extension
 */
export type LspClientOptions = {
  documentSelector: [{ scheme: string; language: string }];
  diagnosticCollectionName: string;
};
