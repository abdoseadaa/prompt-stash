import { h, icon, mount } from "../components/primitives";
import { Icons } from "../icons";

let toastTimer: number | undefined;

/** Transient success note — cleared on a timer so it never piles up. */
export function showToast(container: HTMLElement, message: string): void {
  const banner = h("div", "pstash-toast");
  mount(banner, icon(Icons.check), h("span", undefined, message));
  container.replaceChildren(banner);

  if (toastTimer !== undefined) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => container.replaceChildren(), 4000);
}

export function showError(container: HTMLElement, message: string): void {
  const banner = h("div", "pstash-error");
  mount(banner, h("span", undefined, message));
  container.replaceChildren(banner);
}

export function clearError(container: HTMLElement): void {
  container.replaceChildren();
}
