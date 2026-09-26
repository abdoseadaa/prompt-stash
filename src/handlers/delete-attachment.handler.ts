import * as vscode from "vscode";
import type { DeleteAttachmentPayload } from "../types/message.types";
import { findStash, upsertStash } from "../storage/stash.storage";
import { deleteAttachmentFile } from "../storage/media.storage";
import { postStashes } from "./load-stashes.handler";

export async function handleDeleteAttachment(
  webview: vscode.Webview,
  payload: DeleteAttachmentPayload
): Promise<void> {
  const stash = await findStash(payload.stashId);
  if (!stash) return;

  const attachment = stash.attachments.find((a) => a.id === payload.attachmentId);
  if (!attachment) return;

  await deleteAttachmentFile(payload.stashId, attachment);
  const store = await upsertStash({
    ...stash,
    text: payload.text ?? stash.text,
    attachments: stash.attachments.filter((a) => a.id !== payload.attachmentId),
  });
  await postStashes(webview, store);
}
