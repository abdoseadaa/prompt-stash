import * as vscode from "vscode";
import * as path from "path";
import type { AddAttachmentPayload, AttachmentAddedPayload, WebviewMessage } from "../types/message.types";
import { findStash, upsertStash } from "../storage/stash.storage";
import {
  attachmentUri, mimeFromFileName, readAttachmentFrom, resolveSource, writeAttachment,
} from "../storage/media.storage";
import { readSettings } from "../storage/settings.storage";
import { postStashes } from "./load-stashes.handler";

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function handleAddAttachment(
  webview: vscode.Webview,
  payload: AddAttachmentPayload
): Promise<void> {
  const stash = await findStash(payload.stashId);
  if (!stash) throw new Error("That stash no longer exists — reload the panel.");

  // A drag from the explorer carries a URI and no bytes; a paste carries bytes
  // and a name. Resolving the URI here keeps the platform-specific part on the
  // one side that can get it right.
  const sourceUri = payload.source ? resolveSource(payload.source) : undefined;
  const data = sourceUri
    ? await readAttachmentFrom(sourceUri)
    : Buffer.from(payload.dataBase64 ?? "", "base64");

  if (data.byteLength === 0) throw new Error("Attachment was empty — nothing to save.");

  // Base64 over postMessage degrades badly past a few tens of MB, so the cap is
  // enforced here rather than left to fail somewhere less legible.
  const limit = readSettings().maxAttachmentMb * 1024 * 1024;
  if (data.byteLength > limit) {
    throw new Error(
      `${payload.fileName} is ${formatMb(data.byteLength)} — over the ` +
      `${readSettings().maxAttachmentMb} MB limit (promptStash.maxAttachmentMb).`
    );
  }

  const fileName = payload.fileName || (sourceUri ? path.basename(sourceUri.fsPath) : "file");
  const attachment = await writeAttachment({
    stashId: payload.stashId,
    fileName,
    // A dragged file has no type attached, so it is inferred from the name.
    mime: payload.mime || mimeFromFileName(fileName),
    data: new Uint8Array(data),
  });

  const store = await upsertStash({
    ...stash,
    // The editor may hold unsaved text; folding it in here keeps attaching from
    // discarding what was typed since the last autosave.
    text: payload.text ?? stash.text,
    attachments: [...stash.attachments, attachment],
  });

  const uri = attachmentUri(payload.stashId, attachment);
  await webview.postMessage({
    type: "ATTACHMENT_ADDED",
    payload: {
      stashId: payload.stashId,
      attachment,
      mediaUri: webview.asWebviewUri(uri).toString(),
      mediaPath: uri.fsPath,
    } satisfies AttachmentAddedPayload,
  } satisfies WebviewMessage);

  await postStashes(webview, store);
}
