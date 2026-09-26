import type { Stash } from "../../src/types/stash.types";
import { h, mount } from "../components/primitives";
import { Button } from "../components/button";
import { Icons } from "../icons";
import { renderStashCard, type StashCardCallbacks } from "./stash-card.view";

function emptyState(onCreate: () => void): HTMLElement {
  const hint = h("div", "pstash-empty-hint");
  hint.append(
    "Park a prompt you are not ready to send. Paste screenshots straight into it, then copy the whole thing back out when you are.",
    h("br"),
    h("br"),
    "Already typed one? Copy it out of the chat box and press ",
    h("kbd", undefined, "Ctrl"),
    " ",
    h("kbd", undefined, "Alt"),
    " ",
    h("kbd", undefined, "S"),
    "."
  );

  const wrap = h("div", "pstash-empty");
  mount(
    wrap,
    h("div", "pstash-empty-title", "Nothing stashed"),
    hint,
    Button({ label: "New stash", iconSvg: Icons.plus, variant: "primary", onClick: onCreate }).el
  );
  return wrap;
}

export function renderStashList(
  container: HTMLElement,
  stashes: Stash[],
  openId: string | null,
  mediaUris: Record<string, string>,
  callbacks: StashCardCallbacks,
  onCreate: () => void
): void {
  if (stashes.length === 0) {
    container.replaceChildren(emptyState(onCreate));
    return;
  }

  const frag = document.createDocumentFragment();
  stashes.forEach((stash) => {
    frag.appendChild(renderStashCard(stash, stash.id === openId, mediaUris, callbacks));
  });
  container.replaceChildren(frag);
}
