import type { AttachmentFormat, Stash } from "../types/stash.types";
import { attachmentUri } from "../storage/media.storage";

/**
 * Builds the single block of text that goes on the clipboard.
 *
 * Attachments are referenced by absolute path rather than carried as clipboard
 * image data on purpose: a clipboard write holds one item with alternative
 * flavours, so a real image would displace the prompt text and you could not
 * paste both at once. Paths keep it to one paste, and every agent that can read
 * a file can pick the media up from there — including the Claude Code
 * extension, which drops pasted images outright.
 */
export function buildCopyText(stash: Stash, format: AttachmentFormat): string {
  const body = stash.text.trimEnd();
  if (stash.attachments.length === 0) return body;

  const lines = stash.attachments.map((attachment) => {
    const fsPath = attachmentUri(stash.id, attachment).fsPath;
    if (format === "markdown") {
      const alt = attachment.fileName.replace(/\.[^.]+$/, "");
      return attachment.isImage ? `![${alt}](${fsPath})` : `[${attachment.fileName}](${fsPath})`;
    }
    if (format === "at-mentions") return `@${fsPath}`;
    return `- ${fsPath}`;
  });

  const heading = format === "paths" ? "Attached files:" : "";
  const block = [heading, ...lines].filter(Boolean).join("\n");
  return body.length > 0 ? `${body}\n\n${block}` : block;
}
