import * as vscode from "vscode";
import type { AttachmentFormat, PromptStashSettings } from "../types/stash.types";

export function readSettings(): PromptStashSettings {
  const config = vscode.workspace.getConfiguration("promptStash");
  return {
    attachmentFormat: config.get<AttachmentFormat>("attachmentFormat", "paths"),
    maxAttachmentMb: config.get<number>("maxAttachmentMb", 20),
  };
}
