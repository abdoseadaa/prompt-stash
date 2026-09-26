import * as vscode from "vscode";
import type { SaveStashPayload } from "../types/message.types";
import type { Stash } from "../types/stash.types";
import { findStash, upsertStash } from "../storage/stash.storage";
import { postStashes } from "./load-stashes.handler";

/**
 * Saves the editor text against an existing stash, or creates the record the
 * first time the webview announces a new id. Attachments are read from the
 * store and written straight back, so a save can never drop them.
 */
export async function handleSaveStash(
  webview: vscode.Webview,
  payload: SaveStashPayload
): Promise<void> {
  const existing = await findStash(payload.stashId);
  const now = Date.now();

  const stash: Stash = existing
    ? { ...existing, text: payload.text }
    : {
        id: payload.stashId,
        title: "",
        text: payload.text,
        attachments: [],
        createdAt: now,
        updatedAt: now,
      };

  const store = await upsertStash(stash);
  await postStashes(webview, store);
}
