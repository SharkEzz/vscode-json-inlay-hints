import {
  createConnection,
  ProposedFeatures,
  type InitializeResult,
  TextDocumentSyncKind,
  TextDocuments,
  type InlayHint,
  InlayHintKind,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseTree, type Node } from 'jsonc-parser';

const connection = createConnection(ProposedFeatures.all);

const documents = new TextDocuments(TextDocument);

connection.onInitialize((): InitializeResult => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    inlayHintProvider: true,
  },
}));

connection.languages.inlayHint.on((params): InlayHint[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }
  const text = document.getText();
  const tree = parseTree(text);
  if (!tree) {
    return [];
  }

  const hints: InlayHint[] = [];

  function traverse(node: Node): void {
    if (!document) {
      return undefined;
    }
    if (node.type === 'property' && node.children && node.children.length === 2) {
      const key = node.children.at(0);
      const value = node.children.at(1);
      if (!key || !value) {
        throw new Error('Invalid key or value');
      }

      const endOfKeyOffset = key.offset + key.length;
      hints.push({
        position: document?.positionAt(endOfKeyOffset),
        label: `: ${value.type}`,
        kind: InlayHintKind.Type,
        paddingLeft: true,
      });
    }

    for (const child of node.children ?? []) {
      traverse(child);
    }
  }

  traverse(tree);
  return hints;
});

documents.listen(connection);
connection.listen();
