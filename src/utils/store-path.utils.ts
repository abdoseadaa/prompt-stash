import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";

const DEFAULT_STORE = "~/.prompt-stash";

/** Expands a leading `~` — VS Code settings hand back the literal string. */
function expandHome(raw: string): string {
  if (raw === "~") return os.homedir();
  if (raw.startsWith("~/") || raw.startsWith("~\\")) {
    return path.join(os.homedir(), raw.slice(2));
  }
  return raw;
}

/**
 * Root of the stash store. Deliberately not `context.globalStorageUri`: that
 * resolves under `~/.config/Code` in VS Code and `~/.config/Cursor` in Cursor,
 * so the two editors would keep separate stashes. A home-directory folder is
 * shared by both.
 */
export function getStoreDir(): vscode.Uri {
  const configured = vscode.workspace
    .getConfiguration("promptStash")
    .get<string>("storePath", DEFAULT_STORE);
  const resolved = expandHome((configured || DEFAULT_STORE).trim());
  return vscode.Uri.file(path.resolve(resolved));
}

export function getStoreFile(): vscode.Uri {
  return vscode.Uri.joinPath(getStoreDir(), "stashes.json");
}

export function getMediaDir(): vscode.Uri {
  return vscode.Uri.joinPath(getStoreDir(), "media");
}

export function getStashMediaDir(stashId: string): vscode.Uri {
  return vscode.Uri.joinPath(getMediaDir(), stashId);
}
