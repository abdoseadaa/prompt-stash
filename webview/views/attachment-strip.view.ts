import type { Stash, StashAttachment } from "../../src/types/stash.types";
import { h, icon, mount } from "../components/primitives";
import { IconButton } from "../components/button";
import { Icons } from "../icons";

export interface AttachmentCallbacks {
  onPreview(attachment: StashAttachment): void;
  onCopyImage(attachment: StashAttachment): void;
  onReveal(attachment: StashAttachment): void;
  onDelete(attachment: StashAttachment): void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function thumb(
  attachment: StashAttachment,
  mediaUri: string | undefined,
  onPreview: () => void
): HTMLElement {
  if (!attachment.isImage || !mediaUri) return fileGlyph();

  const img = h("img", "pstash-att-thumb") as HTMLImageElement;
  img.src = mediaUri;
  img.alt = attachment.fileName;
  img.loading = "lazy";

  // The whole thumbnail is the hit target; the icon is the hover affordance, so
  // opening the preview never depends on hitting a 13px glyph exactly.
  const overlay = h("button", "pstash-att-open") as HTMLButtonElement;
  overlay.type = "button";
  overlay.title = `Preview ${attachment.fileName}`;
  overlay.setAttribute("aria-label", `Preview ${attachment.fileName}`);
  mount(overlay, icon(Icons.expand));
  overlay.addEventListener("click", onPreview);

  const wrap = h("div", "pstash-att-preview", img, overlay);

  // A broken thumbnail almost always means the media folder is missing from
  // localResourceRoots, so degrade to the file glyph rather than a dead icon.
  img.addEventListener("error", () => wrap.replaceWith(fileGlyph()));
  return wrap;
}

function fileGlyph(): HTMLElement {
  return h("div", "pstash-att-file", icon(Icons.file));
}

function attachmentCard(
  attachment: StashAttachment,
  mediaUri: string | undefined,
  callbacks: AttachmentCallbacks
): HTMLElement {
  const actions = h("div", "pstash-att-actions");
  if (attachment.isImage) {
    mount(actions, IconButton({
      iconSvg: Icons.image,
      title: "Copy as image — pastes inline in Cursor and Copilot Chat. " +
        "The Claude Code extension does not accept pasted images; use Copy for that.",
      onClick: () => callbacks.onCopyImage(attachment),
    }));
  }
  mount(
    actions,
    IconButton({
      iconSvg: Icons.reveal,
      title: "Reveal in file manager",
      onClick: () => callbacks.onReveal(attachment),
    }),
    IconButton({
      iconSvg: Icons.trash,
      title: "Remove attachment",
      variant: "danger",
      onClick: () => callbacks.onDelete(attachment),
    })
  );

  const card = h("div", "pstash-att");
  card.title = `${attachment.fileName} · ${formatBytes(attachment.bytes)}`;
  mount(
    card,
    thumb(attachment, mediaUri, () => callbacks.onPreview(attachment)),
    h("div", "pstash-att-name", attachment.fileName),
    actions
  );
  return card;
}

export function renderAttachmentStrip(
  stash: Stash,
  mediaUris: Record<string, string>,
  callbacks: AttachmentCallbacks
): HTMLElement | null {
  if (stash.attachments.length === 0) return null;
  const strip = h("div", "pstash-attachments");
  stash.attachments.forEach((attachment) => {
    strip.appendChild(attachmentCard(attachment, mediaUris[attachment.id], callbacks));
  });
  return strip;
}
