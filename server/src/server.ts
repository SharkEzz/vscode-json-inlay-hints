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

function inferType(node: Node): string {
  if (node.type !== 'array') {
    return node.type;
  }
  const elementTypes = (node.children ?? []).map((child) => inferType(child));
  const [first] = elementTypes;
  if (first === undefined || new Set(elementTypes).size > 1) {
    return 'array';
  }
  return `${first}[]`;
}

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

  function traverse(node: Node, doc: TextDocument): void {
    if (node.type === 'property' && node.children && node.children.length === 2) {
      const key = node.children.at(0);
      const value = node.children.at(1);
      if (!key || !value) {
        return;
      }

      const endOfKeyOffset = key.offset + key.length;
      hints.push({
        position: doc.positionAt(endOfKeyOffset),
        label: `: ${inferType(value)}`,
        kind: InlayHintKind.Type,
        paddingLeft: true,
      });
    }

    for (const child of node.children ?? []) {
      traverse(child, doc);
    }
  }

  traverse(tree, document);
  return hints;
});

documents.listen(connection);
connection.listen();
