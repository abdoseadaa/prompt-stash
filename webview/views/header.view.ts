import { h, mount } from "../components/primitives";
import { Button, IconButton } from "../components/button";
import { Icons } from "../icons";

export interface HeaderCallbacks {
  onCreate(): void;
  onOpenStore(): void;
}

export function renderHeader(
  container: HTMLElement,
  count: number,
  callbacks: HeaderCallbacks
): void {
  const header = h("div", "pstash-header");
  mount(
    header,
    h("span", "pstash-header-title", "Stashes"),
    count > 0 ? h("span", "pstash-count", String(count)) : null,
    IconButton({
      iconSvg: Icons.folder,
      title: "Reveal the stash folder",
      onClick: callbacks.onOpenStore,
    }),
    Button({
      label: "New",
      iconSvg: Icons.plus,
      variant: "primary",
      title: "Start a new stash",
      onClick: callbacks.onCreate,
    }).el
  );
  container.replaceChildren(header);
}
