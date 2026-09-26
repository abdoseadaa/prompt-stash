import * as vscode from "vscode";
import type { DeleteStashPayload } from "../types/message.types";
import { removeStash } from "../storage/stash.storage";
import { deleteStashMedia } from "../storage/media.storage";
import { postStashes } from "./load-stashes.handler";

export async function handleDeleteStash(
  webview: vscode.Webview,
  payload: DeleteStashPayload
): Promise<void> {
  const store = await removeStash(payload.stashId);
  // Media goes with the record, otherwise the store accumulates orphan folders.
  await deleteStashMedia(payload.stashId);
  await postStashes(webview, store);
}
