import * as vscode from "vscode";
import type { StashesPayload, WebviewMessage } from "../types/message.types";
import type { StashStore } from "../types/stash.types";
import { readStore, sortedStashes } from "../storage/stash.storage";
import { attachmentUri } from "../storage/media.storage";
import { readSettings } from "../storage/settings.storage";

/**
 * Attachment files sit outside the extension folder, so the webview cannot
 * build their URIs itself — they are resolved here and sent down with the data.
 */
export function buildMediaMaps(
  webview: vscode.Webview,
  store: StashStore
): { mediaUris: Record<string, string>; mediaPaths: Record<string, string> } {
  const mediaUris: Record<string, string> = {};
  const mediaPaths: Record<string, string> = {};
  for (const stash of store.stashes) {
    for (const attachment of stash.attachments) {
      const uri = attachmentUri(stash.id, attachment);
      mediaUris[attachment.id] = webview.asWebviewUri(uri).toString();
      mediaPaths[attachment.id] = uri.fsPath;
    }
  }
  return { mediaUris, mediaPaths };
}

export async function postStashes(webview: vscode.Webview, store: StashStore): Promise<void> {
  await webview.postMessage({
    type: "STASHES",
    payload: {
      stashes: sortedStashes(store),
      settings: readSettings(),
      ...buildMediaMaps(webview, store),
    } satisfies StashesPayload,
  } satisfies WebviewMessage);
}

export async function handleLoadStashes(webview: vscode.Webview): Promise<void> {
  await postStashes(webview, await readStore());
}
