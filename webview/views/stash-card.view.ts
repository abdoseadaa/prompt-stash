import type { Stash, StashAttachment } from "../../src/types/stash.types";
import { h, icon, mount } from "../components/primitives";
import { Button, IconButton } from "../components/button";
import { Icons } from "../icons";
import { renderAttachmentStrip } from "./attachment-strip.view";
import { filesFromDataTransfer, urisFromDataTransfer, type IngestedFile } from "../clipboard.bridge";

export interface StashCardCallbacks {
  onTextChange(stashId: string, text: string): void;
  onCopy(stashId: string): void;
  onDelete(stashId: string): void;
  onAttachFiles(stashId: string, files: IngestedFile[]): void;
  onAttachUris(stashId: string, uris: string[]): void;
  onPreviewAttachment(stashId: string, attachment: StashAttachment): void;
  onCopyImage(stashId: string, attachment: StashAttachment): void;
  onRevealAttachment(stashId: string, attachment: StashAttachment): void;
  onDeleteAttachment(stashId: string, attachment: StashAttachment): void;
  onToggle(stashId: string): void;
}

function relativeTime(ts: number): string {
  const seconds = Math.round((Date.now() - ts) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function buildHead(stash: Stash, isOpen: boolean, callbacks: StashCardCallbacks): HTMLElement {
  const head = h("div", "pstash-card-head");
  head.setAttribute("role", "button");
  head.tabIndex = 0;
  head.setAttribute("aria-expanded", String(isOpen));

  const meta = h("div", "pstash-card-meta");
  if (stash.attachments.length > 0) {
    const badge = h("span", "pstash-clip-badge");
    mount(badge, icon(Icons.paperclip), h("span", undefined, String(stash.attachments.length)));
    meta.appendChild(badge);
  }
  meta.appendChild(h("span", undefined, relativeTime(stash.updatedAt)));

  mount(
    head,
    icon(Icons.chevronRight, "pstash-ico pstash-chevron"),
    h("span", "pstash-card-title", stash.title),
    meta
  );

  const toggle = (): void => callbacks.onToggle(stash.id);
  head.addEventListener("click", toggle);
  head.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });
  return head;
}

function buildEditor(stash: Stash, callbacks: StashCardCallbacks): HTMLTextAreaElement {
  const textarea = h("textarea", "pstash-textarea") as HTMLTextAreaElement;
  textarea.value = stash.text;
  textarea.placeholder = "Park the prompt here. Paste screenshots straight in, or drop files.";
  textarea.spellcheck = false;

  textarea.addEventListener("input", () => callbacks.onTextChange(stash.id, textarea.value));

  // Media ingest. The text part of a paste is left alone so it still lands in
  // the textarea normally; only files are intercepted.
  textarea.addEventListener("paste", (e: ClipboardEvent) => {
    void (async () => {
      const files = await filesFromDataTransfer(e.clipboardData);
      if (files.length === 0) return;
      e.preventDefault();
      callbacks.onAttachFiles(stash.id, files);
    })();
  });

  const setDropping = (on: boolean): void => {
    textarea.classList.toggle("is-dropping", on);
  };

  textarea.addEventListener("dragover", (e: DragEvent) => {
    if (!e.dataTransfer) return;
    e.preventDefault();
    setDropping(true);
  });
  textarea.addEventListener("dragleave", () => setDropping(false));
  textarea.addEventListener("drop", (e: DragEvent) => {
    setDropping(false);
    // A drag out of the VS Code explorer carries only a uri-list, so the host
    // reads those off disk instead of copying bytes through postMessage.
    const uris = urisFromDataTransfer(e.dataTransfer);
    if (uris.length > 0) {
      e.preventDefault();
      callbacks.onAttachUris(stash.id, uris);
      return;
    }
    void (async () => {
      const files = await filesFromDataTransfer(e.dataTransfer);
      if (files.length === 0) return;
      e.preventDefault();
      callbacks.onAttachFiles(stash.id, files);
    })();
  });

  return textarea;
}

export function renderStashCard(
  stash: Stash,
  isOpen: boolean,
  mediaUris: Record<string, string>,
  callbacks: StashCardCallbacks
): HTMLElement {
  const card = h("div", `pstash-card${isOpen ? " is-open" : ""}`);
  card.appendChild(buildHead(stash, isOpen, callbacks));
  if (!isOpen) return card;

  const body = h("div", "pstash-card-body");
  const picker = h("input") as HTMLInputElement;
  picker.type = "file";
  picker.multiple = true;
  picker.hidden = true;
  picker.addEventListener("change", () => {
    void (async () => {
      const data = new DataTransfer();
      Array.from(picker.files ?? []).forEach((f) => data.items.add(f));
      const files = await filesFromDataTransfer(data);
      if (files.length > 0) callbacks.onAttachFiles(stash.id, files);
      picker.value = "";
    })();
  });

  const actions = h("div", "pstash-actions");
  mount(
    actions,
    Button({
      label: "Copy",
      iconSvg: Icons.copy,
      variant: "primary",
      title: "Copy the prompt and every attachment path to the clipboard",
      onClick: () => callbacks.onCopy(stash.id),
    }).el,
    IconButton({
      iconSvg: Icons.paperclip,
      title: "Attach files",
      onClick: () => picker.click(),
    }),
    IconButton({
      iconSvg: Icons.trash,
      title: "Delete this stash and its files",
      variant: "danger",
      onClick: () => callbacks.onDelete(stash.id),
    })
  );

  mount(
    body,
    buildEditor(stash, callbacks),
    renderAttachmentStrip(stash, mediaUris, {
      onPreview: (a) => callbacks.onPreviewAttachment(stash.id, a),
      onCopyImage: (a) => callbacks.onCopyImage(stash.id, a),
      onReveal: (a) => callbacks.onRevealAttachment(stash.id, a),
      onDelete: (a) => callbacks.onDeleteAttachment(stash.id, a),
    }),
    actions,
    picker
  );

  card.appendChild(body);
  return card;
}
