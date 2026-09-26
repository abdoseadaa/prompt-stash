import * as vscode from "vscode";
import { PromptStashProvider } from "./providers/prompt-stash.provider";
import { deriveTitle, readStore, sortedStashes, upsertStash } from "./storage/stash.storage";
import { copyStash } from "./handlers/copy-stash.handler";
import type { Stash } from "./types/stash.types";

function newStash(text: string): Stash {
  const now = Date.now();
  return {
    id: `stash-${now}`,
    title: deriveTitle(text),
    text,
    attachments: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Captures whatever is on the clipboard as a stash. This is the fast path for
 * the case the extension exists for: a prompt errored, so select-all and copy
 * out of the chat box, hit the keybinding, and it is parked before the draft
 * gets lost.
 */
async function stashFromClipboard(provider: PromptStashProvider): Promise<void> {
  const text = (await vscode.env.clipboard.readText()).trim();
  if (!text) {
    vscode.window.showWarningMessage("Prompt Stash: the clipboard has no text to stash.");
    return;
  }

  const stash = newStash(text);
  await upsertStash(stash);
  await provider.refresh();

  const choice = await vscode.window.showInformationMessage(
    `Stashed "${stash.title}"`,
    "Open Panel"
  );
  if (choice === "Open Panel") await provider.reveal();
}

async function copyLatest(): Promise<void> {
  const stashes = sortedStashes(await readStore());
  if (stashes.length === 0) {
    vscode.window.showWarningMessage("Prompt Stash: nothing stashed yet.");
    return;
  }
  const message = await copyStash(stashes[0]);
  vscode.window.setStatusBarMessage(`Prompt Stash: ${message}`, 4000);
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = new PromptStashProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(PromptStashProvider.viewId, provider, {
      // Keeps an in-progress draft alive when the panel is hidden.
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand("promptStash.openPanel", () => provider.reveal()),
    vscode.commands.registerCommand("promptStash.stashFromClipboard", () => stashFromClipboard(provider)),
    vscode.commands.registerCommand("promptStash.copyLatest", () => copyLatest()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration("promptStash")) return;
      void provider.refresh();
    })
  );
}

export function deactivate(): void {
  // Nothing to tear down: state lives on disk, not in memory.
}
