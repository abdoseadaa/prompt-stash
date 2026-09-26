import * as vscode from "vscode";
import { registerMessageRouter } from "../message-router";
import { getMediaDir } from "../utils/store-path.utils";
import { postStashes } from "../handlers/load-stashes.handler";
import { readStore } from "../storage/stash.storage";

export class PromptStashProvider implements vscode.WebviewViewProvider {
  static readonly viewId = "promptStash.panel";

  private view: vscode.WebviewView | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      // The media folder lives outside the extension (see store-path.utils), so it
      // must be registered explicitly or every attachment thumbnail 404s.
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "webview"),
        getMediaDir(),
      ],
    };

    webviewView.webview.html = this.buildHtml(webviewView.webview);
    registerMessageRouter(webviewView.webview);
  }

  /** Pushes fresh data into an already-open panel, e.g. after a command stashes something. */
  async refresh(): Promise<void> {
    if (!this.view) return;
    await postStashes(this.view.webview, await readStore());
  }

  async reveal(): Promise<void> {
    await vscode.commands.executeCommand(`${PromptStashProvider.viewId}.focus`);
  }

  private buildHtml(webview: vscode.Webview): string {
    const webviewDir = vscode.Uri.joinPath(this.context.extensionUri, "webview");
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewDir, "main.js"));
    const tokensUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewDir, "tokens.css"));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewDir, "styles.css"));
    const nonce = this.getNonce();
    const version = (this.context.extension.packageJSON as { version?: string }).version ?? "unknown";

    // img-src carries the attachment thumbnails; connect-src lets the clipboard
    // bridge fetch() an attachment back as a Blob for navigator.clipboard.write.
    const csp = [
      "default-src 'none'",
      `style-src ${webview.cspSource}`,
      `img-src ${webview.cspSource} data: blob:`,
      `connect-src ${webview.cspSource}`,
      `script-src 'nonce-${nonce}'`,
    ].join("; ");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${tokensUri}">
  <link rel="stylesheet" href="${styleUri}">
  <title>Prompt Stash</title>
</head>
<body>
  <div id="header"></div>
  <div id="toast"></div>
  <div id="error"></div>
  <div id="list"></div>
  <div id="lightbox"></div>
  <script nonce="${nonce}">window.__promptStashVersion = "${version}";</script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private getNonce(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let nonce = "";
    for (let i = 0; i < 32; i++) nonce += chars.charAt(Math.floor(Math.random() * chars.length));
    return nonce;
  }
}
