/**
 * The media half of the extension, and the reason the UI is a webview at all.
 *
 * `vscode.env.clipboard` is text-only, but a webview is a real Chromium
 * document, so `navigator.clipboard.write()` with a `ClipboardItem` is
 * available here — the same mechanism VS Code's own webview "Copy image"
 * action uses. That gives a genuine inline image paste in Cursor and Copilot
 * Chat (the Claude Code extension discards pasted images, which is why the
 * path-based copy remains the default).
 */

export interface IngestedFile {
  fileName: string;
  mime: string;
  dataBase64: string;
}

/** Chromium refuses anything but PNG for an image ClipboardItem write. */
const NATIVE_CLIPBOARD_IMAGE_MIME = "image/png";

function readAsBase64(file: File | Blob, fileName: string, mime: string): Promise<IngestedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${fileName}.`));
    reader.onload = () => {
      const result = String(reader.result);
      // readAsDataURL gives "data:<mime>;base64,<payload>" — the host wants the payload.
      const comma = result.indexOf(",");
      resolve({ fileName, mime, dataBase64: comma >= 0 ? result.slice(comma + 1) : result });
    };
    reader.readAsDataURL(file);
  });
}

function nameFor(file: File, index: number): string {
  if (file.name) return file.name;
  const ext = (file.type.split("/")[1] || "bin").replace("+xml", "");
  return `pasted-${Date.now()}-${index + 1}.${ext}`;
}

/** Pulls every file off a paste or drop, ignoring the plain-text parts. */
export async function filesFromDataTransfer(data: DataTransfer | null): Promise<IngestedFile[]> {
  if (!data) return [];

  const files: File[] = [];
  // `items` covers clipboard pastes; `files` covers OS drags. They overlap, so
  // prefer items and fall back rather than ingesting each file twice.
  if (data.items && data.items.length > 0) {
    for (const item of Array.from(data.items)) {
      if (item.kind !== "file") continue;
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
  if (files.length === 0 && data.files) files.push(...Array.from(data.files));

  return Promise.all(files.map((file, i) => readAsBase64(file, nameFor(file, i), file.type || "application/octet-stream")));
}

/**
 * URIs for files dragged out of the VS Code explorer. These arrive as a
 * uri-list with no bytes attached, so the host reads them off disk instead.
 *
 * The URIs are handed over untouched. Turning `file:///C:/x.png` into a path by
 * trimming the scheme leaves a leading slash that Windows cannot open, and it
 * mangles UNC paths — the host resolves them with `Uri.parse`, which gets both
 * right.
 */
export function urisFromDataTransfer(data: DataTransfer | null): string[] {
  const list = data?.getData("text/uri-list");
  if (!list) return [];
  return list
    .split(/\r?\n/)
    .map((line) => line.trim())
    // RFC 2483 allows comment lines in a uri-list.
    .filter((line) => line.length > 0 && !line.startsWith("#") && line.startsWith("file://"));
}

async function toPngBlob(blob: Blob): Promise<Blob> {
  if (blob.type === NATIVE_CLIPBOARD_IMAGE_MIME) return blob;

  // JPEG, WebP, GIF and friends have to be re-encoded, since Chromium only
  // accepts PNG for a native image clipboard write.
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable, so the image cannot be converted to PNG.");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (out) => (out ? resolve(out) : reject(new Error("PNG conversion produced no data."))),
      NATIVE_CLIPBOARD_IMAGE_MIME
    );
  });
}

export type ImageCopyResult =
  | { ok: true }
  | { ok: false; fellBackToPath: boolean; reason: string };

/**
 * Puts a real image on the system clipboard. Falls back to copying the file
 * path as text, because the write can be refused for reasons outside our
 * control — the API requires a focused document and a user gesture, and
 * support varies by host.
 */
export async function copyImageToClipboard(
  mediaUri: string,
  fsPath: string
): Promise<ImageCopyResult> {
  const fallback = async (reason: string): Promise<ImageCopyResult> => {
    try {
      await navigator.clipboard.writeText(fsPath);
      return { ok: false, fellBackToPath: true, reason };
    } catch {
      return { ok: false, fellBackToPath: false, reason };
    }
  };

  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    return fallback("this editor build has no image clipboard support");
  }
  if (!document.hasFocus()) {
    return fallback("the panel lost focus");
  }

  try {
    const response = await fetch(mediaUri);
    if (!response.ok) throw new Error(`could not read the file back (${response.status})`);
    const png = await toPngBlob(await response.blob());
    await navigator.clipboard.write([new ClipboardItem({ [NATIVE_CLIPBOARD_IMAGE_MIME]: png })]);
    return { ok: true };
  } catch (err) {
    return fallback((err as Error).message || "the clipboard write was refused");
  }
}
