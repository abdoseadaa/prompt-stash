/** Low-level DOM helpers every component builds on. */

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  children.forEach((child) => {
    if (child === null || child === undefined) return;
    el.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  });
  return el;
}

/** Icons ship as trusted SVG strings from icons.ts — never user content. */
export function icon(svg: string, className = "pstash-ico"): HTMLSpanElement {
  const span = h("span", className);
  span.innerHTML = svg;
  return span;
}

export function mount(parent: HTMLElement, ...children: (Node | null | undefined)[]): void {
  children.forEach((c) => c && parent.appendChild(c));
}

export function Skeleton(rows: number): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < rows; i++) frag.appendChild(h("div", "pstash-skeleton"));
  return frag;
}
