/** A file parked alongside a stash. Bytes live on disk under media/<stashId>/. */
export interface StashAttachment {
  id: string;
  /** Original name, kept for display and for the markdown alt text. */
  fileName: string;
  mime: string;
  bytes: number;
  /** Drives whether the "Copy as image" button renders. */
  isImage: boolean;
}

export interface Stash {
  id: string;
  title: string;
  text: string;
  attachments: StashAttachment[];
  createdAt: number;
  updatedAt: number;
}

export interface StashStore {
  version: 1;
  stashes: Stash[];
}

/** How attachment paths are written into the copied text. */
export type AttachmentFormat = "paths" | "markdown" | "at-mentions";

export interface PromptStashSettings {
  attachmentFormat: AttachmentFormat;
  maxAttachmentMb: number;
}
