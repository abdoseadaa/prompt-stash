import * as vscode from "vscode";
import type { CopiedPayload, CopyStashPayload, WebviewMessage } from "../types/message.types";
import type { Stash } from "../types/stash.types";
import { findStash, upsertStash } from "../storage/stash.storage";
import { readSettings } from "../storage/settings.storage";
import { buildCopyText } from "../utils/prompt-format.utils";
import { postStashes } from "./load-stashes.handler";

/**
 * Puts a stash on the clipboard and does nothing else — no focusing, no
 * revealing, no touching another extension's UI. Shared by the panel and the
 * commands.
 */
export async function copyStash(stash: Stash): Promise<string> {
  const text = buildCopyText(stash, readSettings().attachmentFormat);
  await vscode.env.clipboard.writeText(text);

  const count = stash.attachments.length;
  const media = count === 0 ? "" : ` + ${count} file${count === 1 ? "" : "s"}`;
  return `Copied${media} to the clipboard.`;
}

export async function handleCopyStash(
  webview: vscode.Webview,
  payload: CopyStashPayload
): Promise<void> {
  const existing = await findStash(payload.stashId);
  if (!existing) throw new Error("That stash no longer exists — reload the panel.");

  // Persist the live text first so the clipboard and the store never disagree.
  // Attachments come from the store, never from the message.
  const store = await upsertStash({ ...existing, text: payload.text });
  const saved = store.stashes.find((s) => s.id === payload.stashId) ?? existing;

  const message = await copyStash(saved);
  await webview.postMessage({
    type: "COPIED",
    payload: { stashId: saved.id, message } satisfies CopiedPayload,
  } satisfies WebviewMessage);
  await postStashes(webview, store);
}
