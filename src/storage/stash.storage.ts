import * as vscode from "vscode";
import type { Stash, StashAttachment, StashStore } from "../types/stash.types";
import { getStoreDir, getStoreFile } from "../utils/store-path.utils";

const DEFAULT_STORE: StashStore = { version: 1, stashes: [] };

const IMAGE_MIME = /^image\/(png|jpe?g|gif|webp|bmp|svg\+xml|avif)$/i;

export function isImageMime(mime: string): boolean {
  return IMAGE_MIME.test(mime);
}

function normalizeAttachment(raw: Partial<StashAttachment>, index: number): StashAttachment {
  const mime = raw.mime ?? "application/octet-stream";
  return {
    id: raw.id ?? `att-${index}`,
    fileName: raw.fileName ?? `file-${index}`,
    mime,
    bytes: raw.bytes ?? 0,
    isImage: raw.isImage ?? isImageMime(mime),
  };
}

function normalizeStash(raw: Partial<Stash>, index: number): Stash {
  const now = Date.now();
  const text = raw.text ?? "";
  return {
    id: raw.id ?? `stash-${index}`,
    title: raw.title ?? deriveTitle(text),
    text,
    attachments: (raw.attachments ?? []).map(normalizeAttachment),
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? raw.createdAt ?? now,
  };
}

const TITLE_MAX = 60;

/** First non-empty line, trimmed to something that fits a narrow sidebar. */
export function deriveTitle(text: string): string {
  const line = text.split("\n").map((l) => l.trim()).find((l) => l.length > 0);
  if (!line) return "Untitled stash";
  // The ellipsis counts toward the budget, so the result is never over TITLE_MAX.
  return line.length > TITLE_MAX ? `${line.slice(0, TITLE_MAX - 1)}…` : line;
}

export async function readStore(): Promise<StashStore> {
  try {
    const bytes = await vscode.workspace.fs.readFile(getStoreFile());
    const raw = JSON.parse(new TextDecoder().decode(bytes)) as Partial<StashStore>;
    return {
      version: 1,
      stashes: (raw.stashes ?? []).map(normalizeStash),
    };
  } catch {
    // Missing or unparseable store — start clean rather than blocking the panel.
    return { ...DEFAULT_STORE, stashes: [] };
  }
}

export async function writeStore(store: StashStore): Promise<void> {
  await vscode.workspace.fs.createDirectory(getStoreDir());
  const json = `${JSON.stringify(store, null, 2)}\n`;
  await vscode.workspace.fs.writeFile(getStoreFile(), new TextEncoder().encode(json));
}

/** Newest first — a stash is a draft you just parked, so recency is the order that matters. */
export function sortedStashes(store: StashStore): Stash[] {
  return [...store.stashes].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function upsertStash(stash: Stash): Promise<StashStore> {
  const store = await readStore();
  const index = store.stashes.findIndex((s) => s.id === stash.id);
  const next: Stash = { ...stash, title: deriveTitle(stash.text), updatedAt: Date.now() };
  if (index >= 0) store.stashes[index] = next;
  else store.stashes.push(next);
  await writeStore(store);
  return store;
}

export async function removeStash(stashId: string): Promise<StashStore> {
  const store = await readStore();
  store.stashes = store.stashes.filter((s) => s.id !== stashId);
  await writeStore(store);
  return store;
}

export async function findStash(stashId: string): Promise<Stash | undefined> {
  const store = await readStore();
  return store.stashes.find((s) => s.id === stashId);
}
