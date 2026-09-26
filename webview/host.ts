declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };

// acquireVsCodeApi may only be called once per webview, so the handle is taken
// here and shared, rather than in whichever module happens to load first.
const vscode = acquireVsCodeApi();

export function post(type: string, payload?: unknown): void {
  vscode.postMessage({ type, payload });
}

/** Sends a line to the extension's Output channel. */
export function logToHost(line: string): void {
  post("LOG", { line });
}
