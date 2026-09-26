import type { Stash, StashAttachment } from "../src/types/stash.types";
import type {
  AttachmentAddedPayload, CopiedPayload, ErrorPayload, StashesPayload, WebviewMessage,
} from "../src/types/message.types";
import { renderHeader } from "./views/header.view";
import { renderStashList } from "./views/stash-list.view";
import { clearError, showError, showToast } from "./views/banner.view";
import { openLightbox } from "./views/lightbox.view";
import { Skeleton } from "./components/primitives";
import { copyImageToClipboard, type IngestedFile } from "./clipboard.bridge";
import type { StashCardCallbacks } from "./views/stash-card.view";

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };
const vscode = acquireVsCodeApi();

const SAVE_DEBOUNCE_MS = 400;
const EXPAND_MS = 180;
const EXPAND_EASE = "cubic-bezier(0.2, 0, 0.2, 1)";

const headerEl = document.getElementById("header")!;
const toastEl = document.getElementById("toast")!;
const errorEl = document.getElementById("error")!;
const listEl = document.getElementById("list")!;
const lightboxEl = document.getElementById("lightbox")!;

let stashes: Stash[] = [];
let mediaUris: Record<string, string> = {};
let mediaPaths: Record<string, string> = {};
let openId: string | null = null;
let saveTimer: number | undefined;
let pendingSaveId: string | null = null;
let animating = false;
let renderQueued = false;

function post(type: string, payload?: unknown): void {
  vscode.postMessage({ type, payload });
}

function findStash(stashId: string): Stash | undefined {
  return stashes.find((s) => s.id === stashId);
}

/** Text of the open editor, which may be ahead of what the store has. */
function liveText(stashId: string): string | undefined {
  if (openId !== stashId) return undefined;
  const textarea = listEl.querySelector<HTMLTextAreaElement>(".pstash-textarea");
  return textarea?.value;
}

/**
 * Re-renders without stealing the caret. Only one card is open at a time, so
 * there is at most one textarea to carry across — its value is preserved too,
 * since a rebuild would otherwise reset it to the last saved text.
 */
function render(): void {
  // A rebuild mid-animation would rip out the element being animated, so the
  // render waits for the accordion to settle.
  if (animating) {
    renderQueued = true;
    return;
  }

  const active = document.activeElement;
  const wasEditing = active instanceof HTMLTextAreaElement;
  const value = wasEditing ? active.value : null;
  const start = wasEditing ? active.selectionStart : 0;
  const end = wasEditing ? active.selectionEnd : 0;
  const scrollTop = wasEditing ? active.scrollTop : 0;

  renderHeader(headerEl, stashes.length, {
    onCreate: createStash,
    onOpenStore: () => post("OPEN_STORE"),
  });
  renderStashList(listEl, stashes, openId, mediaUris, callbacks, createStash);

  if (!wasEditing) return;
  const textarea = listEl.querySelector<HTMLTextAreaElement>(".pstash-textarea");
  if (!textarea) return;
  if (value !== null) textarea.value = value;
  textarea.focus();
  textarea.setSelectionRange(start, end);
  textarea.scrollTop = scrollTop;
}

function cancelPendingSave(): void {
  if (saveTimer !== undefined) window.clearTimeout(saveTimer);
  saveTimer = undefined;
}

/**
 * Sends the pending edit. The stash id is resolved here rather than captured
 * when the save was scheduled — holding a reference across an incoming STASHES
 * message would send a snapshot from before an attachment landed.
 */
function flushSave(): void {
  cancelPendingSave();
  const stashId = pendingSaveId;
  pendingSaveId = null;
  if (!stashId) return;

  const stash = findStash(stashId);
  if (!stash) return;
  post("SAVE_STASH", { stashId, text: liveText(stashId) ?? stash.text });
}

function scheduleSave(stashId: string, text: string): void {
  const stash = findStash(stashId);
  if (!stash) return;
  stash.text = text;

  pendingSaveId = stashId;
  cancelPendingSave();
  saveTimer = window.setTimeout(flushSave, SAVE_DEBOUNCE_MS);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function openBody(): HTMLElement | null {
  return listEl.querySelector<HTMLElement>(".pstash-card.is-open .pstash-card-body");
}

/**
 * Runs an accordion animation, holding renders until it settles.
 *
 * Settling is never left to the animation alone. An unfocused or hidden panel
 * stops Chromium advancing the animation timeline, so `onfinish` may never
 * arrive — and anything waiting on it, including the queued renders, would be
 * stuck for good. The timer below is what actually guarantees the state change.
 */
function animateBody(body: HTMLElement, opening: boolean, done?: () => void): void {
  const height = body.scrollHeight;
  const collapsed = { height: "0px", opacity: 0 };
  const expanded = { height: `${height}px`, opacity: 1 };

  let settled = false;
  const settle = (): void => {
    if (settled) return;
    settled = true;
    body.style.overflow = "";
    animating = false;
    done?.();
    if (renderQueued) {
      renderQueued = false;
      render();
    }
  };

  animating = true;
  body.style.overflow = "hidden";

  const animation = body.animate(opening ? [collapsed, expanded] : [expanded, collapsed], {
    duration: EXPAND_MS,
    easing: EXPAND_EASE,
  });
  animation.onfinish = settle;
  animation.oncancel = settle;

  window.setTimeout(() => {
    if (!settled) animation.cancel();
    settle();
  }, EXPAND_MS + 150);
}

function toggleStash(stashId: string): void {
  // Collapsing destroys the textarea, so the pending edit goes out while the
  // element it came from is still in the DOM.
  flushSave();
  clearError(errorEl);

  const closing = openId === stashId;
  const body = closing ? openBody() : null;

  if (closing && body && !prefersReducedMotion()) {
    // Drop the class straight away so the chevron rotates with the collapse.
    body.closest(".pstash-card")?.classList.remove("is-open");
    animateBody(body, false, () => {
      openId = null;
      render();
    });
    return;
  }

  openId = closing ? null : stashId;
  render();
  if (closing) return;

  const opened = openBody();
  if (opened && !prefersReducedMotion()) animateBody(opened, true);
}

function createStash(): void {
  const now = Date.now();
  const stash: Stash = {
    id: `stash-${now}`,
    title: "Untitled stash",
    text: "",
    attachments: [],
    createdAt: now,
    updatedAt: now,
  };
  // Saved immediately, not on first keystroke: attachments need a stash that
  // already exists on the host side.
  stashes = [stash, ...stashes];
  openId = stash.id;
  clearError(errorEl);
  render();
  post("SAVE_STASH", { stashId: stash.id, text: "" });

  const body = openBody();
  if (body && !prefersReducedMotion()) animateBody(body, true);
  listEl.querySelector<HTMLTextAreaElement>(".pstash-textarea")?.focus();
}

async function onCopyImage(stashId: string, attachment: StashAttachment): Promise<void> {
  const uri = mediaUris[attachment.id];
  const fsPath = mediaPaths[attachment.id];
  if (!uri || !fsPath) return;

  const result = await copyImageToClipboard(uri, fsPath);
  if (result.ok) {
    showToast(toastEl, `Copied ${attachment.fileName} as an image — paste it into the chat.`);
    return;
  }
  if (result.fellBackToPath) {
    showToast(toastEl, `Image copy unavailable (${result.reason}) — copied the file path instead.`);
    return;
  }
  showError(errorEl, `Could not copy ${attachment.fileName}: ${result.reason}.`);
}

const callbacks: StashCardCallbacks = {
  onTextChange: scheduleSave,

  onToggle: toggleStash,

  onCopy: (stashId) => {
    const stash = findStash(stashId);
    if (!stash) return;
    // The debounced save is dropped and the live text travels with the copy, so
    // the host saves and copies in one step rather than racing.
    cancelPendingSave();
    pendingSaveId = null;
    post("COPY_STASH", { stashId, text: liveText(stashId) ?? stash.text });
  },

  onDelete: (stashId) => {
    if (openId === stashId) openId = null;
    stashes = stashes.filter((s) => s.id !== stashId);
    render();
    post("DELETE_STASH", { stashId });
  },

  onAttachFiles: (stashId, files: IngestedFile[]) => {
    const text = liveText(stashId);
    files.forEach((file) => post("ADD_ATTACHMENT", { stashId, text, ...file }));
  },

  onAttachUris: (stashId, uris) => {
    const text = liveText(stashId);
    // No file name or type is derived here: splitting a URI on "/" gets Windows
    // paths wrong. The host resolves the URI and reads both from it.
    uris.forEach((source) => post("ADD_ATTACHMENT", { stashId, text, source }));
  },

  onPreviewAttachment: (_stashId, attachment) => {
    const uri = mediaUris[attachment.id];
    if (uri) openLightbox(lightboxEl, uri, attachment.fileName);
  },

  onCopyImage: (stashId, attachment) => void onCopyImage(stashId, attachment),

  onRevealAttachment: (stashId, attachment) =>
    post("REVEAL_ATTACHMENT", { stashId, attachmentId: attachment.id }),

  onDeleteAttachment: (stashId, attachment) =>
    post("DELETE_ATTACHMENT", { stashId, attachmentId: attachment.id, text: liveText(stashId) }),
};

window.addEventListener("message", (event: MessageEvent<WebviewMessage>) => {
  const message = event.data;

  const handlers: Record<string, () => void> = {
    STASHES: () => {
      const payload = message.payload as StashesPayload;
      stashes = payload.stashes;
      mediaUris = payload.mediaUris;
      mediaPaths = payload.mediaPaths;
      if (openId && !findStash(openId)) openId = null;
      render();
    },
    ATTACHMENT_ADDED: () => {
      const payload = message.payload as AttachmentAddedPayload;
      mediaUris[payload.attachment.id] = payload.mediaUri;
      mediaPaths[payload.attachment.id] = payload.mediaPath;
      clearError(errorEl);
    },
    COPIED: () => {
      showToast(toastEl, (message.payload as CopiedPayload).message);
      clearError(errorEl);
    },
    ERROR: () => showError(errorEl, (message.payload as ErrorPayload).message),
  };
  handlers[message.type]?.();
});

/**
 * Claims file drags for this panel, and must run for the whole document rather
 * than just the drop target.
 *
 * VS Code's webview host does this (pre/index.html, handleInnerDragStartEvent):
 *
 *     window.addEventListener('dragenter', e => {
 *       if (e.defaultPrevented) return;            // extension wants it
 *       if (every item is kind === 'file')
 *         hostMessaging.postMessage('drag-start')  // workbench takes the drag
 *     })
 *
 * Once the workbench takes it, the iframe stops receiving the drag entirely, so
 * a dragenter handler bound only to the card is far too late — the first
 * dragenter lands on <body> as the cursor crosses into the panel, and the drag
 * is gone before it reaches any card. Calling preventDefault here is the
 * documented way to keep it.
 *
 * Handling drop as well means a file let go outside a stash is swallowed rather
 * than navigating the webview to it, which would replace the panel.
 */
function claimFileDrags(): void {
  const claim = (event: DragEvent): void => {
    if (!Array.from(event.dataTransfer?.types ?? []).includes("Files")) return;
    event.preventDefault();
  };
  document.addEventListener("dragenter", claim);
  document.addEventListener("dragover", claim);
  document.addEventListener("drop", claim);
}

claimFileDrags();
listEl.replaceChildren(Skeleton(3));
post("LOAD_STASHES");
