import * as vscode from "vscode";

let channel: vscode.OutputChannel | undefined;

export function getLogChannel(): vscode.OutputChannel {
  if (!channel) channel = vscode.window.createOutputChannel("Prompt Stash");
  return channel;
}

/**
 * Writes to the Output panel rather than the webview console. Reading the
 * webview's own console means finding the right frame in developer tools, which
 * is easy to get wrong — the workbench console looks plausible and shows
 * nothing useful.
 */
export function log(line: string): void {
  const time = new Date().toISOString().slice(11, 23);
  getLogChannel().appendLine(`${time}  ${line}`);
}

export function disposeLogChannel(): void {
  channel?.dispose();
  channel = undefined;
}
