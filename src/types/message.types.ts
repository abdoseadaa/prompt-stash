import type { Stash, StashAttachment, PromptStashSettings } from "./stash.types";

export type MessageType =
  // webview -> host
  | "LOAD_STASHES"
  | "SAVE_STASH"
  | "DELETE_STASH"
  | "ADD_ATTACHMENT"
  | "DELETE_ATTACHMENT"
  | "COPY_STASH"
  | "REVEAL_ATTACHMENT"
  | "OPEN_STORE"
  | "LOG"
  // host -> webview
  | "STASHES"
  | "ATTACHMENT_ADDED"
  | "COPIED"
  | "ERROR";

export interface WebviewMessage {
  type: MessageType;
  payload?: unknown;
}

/**
 * Only ever the text. The webview is deliberately not authoritative about
 * attachments: a debounced save used to carry a whole stash snapshot, and a
 * snapshot taken before an attachment landed would silently overwrite the
 * record when the timer fired — leaving the file on disk with nothing
 * pointing at it. The host owns the attachment list; messages that change it
 * say so explicitly.
 */
export interface SaveStashPayload {
  stashId: string;
  text: string;
}

export interface DeleteStashPayload {
  stashId: string;
}

/**
 * Attachment bytes arrive base64-encoded because postMessage cannot carry a
 * Blob. `dataBase64` is omitted when the webview only has a path to hand over
 * (a drag out of the VS Code explorer), in which case `source` is set.
 */
export interface AddAttachmentPayload {
  stashId: string;
  /** Present when the bytes travel inline; absent when `source` is set. */
  fileName?: string;
  mime?: string;
  dataBase64?: string;
  /**
   * A `file://` URI or an absolute path for a file already on disk, used when a
   * drag carries no bytes. Resolved host-side rather than in the webview, since
   * only the host can turn a URI into a correct path on every platform.
   */
  source?: string;
  /** Live editor text, folded in so an unsaved draft survives the attach. */
  text?: string;
}

export interface DeleteAttachmentPayload {
  stashId: string;
  attachmentId: string;
  text?: string;
}

/**
 * Carries the live text alongside the id: the host saves and copies in one
 * step, so clicking Copy straight after typing cannot race the autosave and put
 * stale text on the clipboard. Attachments come from the store, not from here.
 */
export interface CopyStashPayload {
  stashId: string;
  text: string;
}

export interface RevealAttachmentPayload {
  stashId: string;
  attachmentId: string;
}

/** Media URIs are resolved host-side; the webview cannot build them itself. */
export interface StashesPayload {
  stashes: Stash[];
  settings: PromptStashSettings;
  /** attachmentId -> webview-safe URI for the <img> src. */
  mediaUris: Record<string, string>;
  /**
   * attachmentId -> absolute filesystem path. The webview needs this for the
   * text fallback when a native image copy is refused.
   */
  mediaPaths: Record<string, string>;
}

export interface AttachmentAddedPayload {
  stashId: string;
  attachment: StashAttachment;
  mediaUri: string;
  mediaPath: string;
}

export interface CopiedPayload {
  stashId: string;
  /** Shown in the webview so the user knows paste is ready. */
  message: string;
}

export interface LogPayload {
  line: string;
}

export interface ErrorPayload {
  message: string;
}
