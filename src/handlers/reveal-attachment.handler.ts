import * as vscode from "vscode";
import type { RevealAttachmentPayload } from "../types/message.types";
import { findStash } from "../storage/stash.storage";
import { attachmentUri } from "../storage/media.storage";
import { getStoreDir } from "../utils/store-path.utils";

export async function handleRevealAttachment(
  _webview: vscode.Webview,
  payload: RevealAttachmentPayload
): Promise<void> {
  const stash = await findStash(payload.stashId);
  const attachment = stash?.attachments.find((a) => a.id === payload.attachmentId);
  if (!stash || !attachment) return;
  await vscode.commands.executeCommand("revealFileInOS", attachmentUri(stash.id, attachment));
}

export async function handleOpenStore(): Promise<void> {
  await vscode.commands.executeCommand("revealFileInOS", getStoreDir());
}
