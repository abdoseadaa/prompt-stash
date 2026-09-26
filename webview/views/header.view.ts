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
  // Shown so the running build is identifiable without opening developer tools
  // and hunting for the right frame.
  const version = (window as unknown as { __promptStashVersion?: string }).__promptStashVersion;

  const header = h("div", "pstash-header");
  mount(
    header,
    h("span", "pstash-header-title", "Stashes"),
    version ? h("span", "pstash-version", `v${version}`) : null,
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
