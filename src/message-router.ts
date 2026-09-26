import * as vscode from "vscode";
import { handleLoadStashes } from "./handlers/load-stashes.handler";
import { handleSaveStash } from "./handlers/save-stash.handler";
import { handleDeleteStash } from "./handlers/delete-stash.handler";
import { handleAddAttachment } from "./handlers/add-attachment.handler";
import { handleDeleteAttachment } from "./handlers/delete-attachment.handler";
import { handleCopyStash } from "./handlers/copy-stash.handler";
import { handleOpenStore, handleRevealAttachment } from "./handlers/reveal-attachment.handler";
import type {
  AddAttachmentPayload, CopyStashPayload, DeleteAttachmentPayload, DeleteStashPayload,
  ErrorPayload, RevealAttachmentPayload, SaveStashPayload, WebviewMessage,
} from "./types/message.types";

type MessageHandler = (webview: vscode.Webview, payload: unknown) => Promise<void>;

const handlers: Record<string, MessageHandler> = {
  LOAD_STASHES: (webview) => handleLoadStashes(webview),
  SAVE_STASH: (webview, payload) => handleSaveStash(webview, payload as SaveStashPayload),
  DELETE_STASH: (webview, payload) => handleDeleteStash(webview, payload as DeleteStashPayload),
  ADD_ATTACHMENT: (webview, payload) => handleAddAttachment(webview, payload as AddAttachmentPayload),
  DELETE_ATTACHMENT: (webview, payload) => handleDeleteAttachment(webview, payload as DeleteAttachmentPayload),
  COPY_STASH: (webview, payload) => handleCopyStash(webview, payload as CopyStashPayload),
  REVEAL_ATTACHMENT: (webview, payload) => handleRevealAttachment(webview, payload as RevealAttachmentPayload),
  OPEN_STORE: () => handleOpenStore(),
};

export function registerMessageRouter(webview: vscode.Webview): void {
  webview.onDidReceiveMessage(async (message: WebviewMessage) => {
    const handler = handlers[message.type];
    if (!handler) return;
    try {
      await handler(webview, message.payload);
    } catch (err) {
      await webview.postMessage({
        type: "ERROR",
        payload: { message: (err as Error).message } satisfies ErrorPayload,
      } satisfies WebviewMessage);
    }
  });
}
