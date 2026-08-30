import * as path from 'node:path';
import type { ExtensionContext } from 'vscode';
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient | null = null;

export async function activate(context: ExtensionContext): Promise<void> {
  const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { language: 'json', scheme: 'file' },
      { language: 'jsonc', scheme: 'file' },
    ],
  };

  client = new LanguageClient('jsonInlayHints', 'JSON Inlay Hints Language Server', serverOptions, clientOptions);
  await client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
