import { h, icon, mount } from "./primitives";

export type ButtonVariant = "primary" | "secondary" | "danger";

export interface ButtonOptions {
  label?: string;
  iconSvg?: string;
  variant?: ButtonVariant;
  full?: boolean;
  title?: string;
  disabled?: boolean;
  onClick?: (e: MouseEvent) => void;
}

export interface ButtonHandle {
  el: HTMLButtonElement;
  setLabel(label: string): void;
  setDisabled(disabled: boolean): void;
}

export function Button(opts: ButtonOptions): ButtonHandle {
  const { label, iconSvg, variant = "secondary", full = false, title, disabled = false, onClick } = opts;

  const classes = ["pstash-btn", `pstash-btn--${variant}`, full ? "pstash-btn--full" : ""]
    .filter(Boolean)
    .join(" ");

  const el = h("button", classes) as HTMLButtonElement;
  el.type = "button";
  if (title) el.title = title;
  el.disabled = disabled;

  const labelEl = label ? h("span", undefined, label) : null;
  mount(el, iconSvg ? icon(iconSvg) : null, labelEl);
  if (onClick) el.addEventListener("click", onClick);

  return {
    el,
    setLabel(next: string): void { if (labelEl) labelEl.textContent = next; },
    setDisabled(next: boolean): void { el.disabled = next; },
  };
}

export interface IconButtonOptions {
  iconSvg: string;
  title: string;
  variant?: "ghost" | "danger";
  onClick?: (e: MouseEvent) => void;
}

export function IconButton(opts: IconButtonOptions): HTMLButtonElement {
  const { iconSvg, title, variant = "ghost", onClick } = opts;
  const el = h("button", `pstash-iconbtn pstash-iconbtn--${variant}`) as HTMLButtonElement;
  el.type = "button";
  el.title = title;
  mount(el, icon(iconSvg));
  if (onClick) el.addEventListener("click", onClick);
  return el;
}
