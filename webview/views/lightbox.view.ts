import { h, mount } from "../components/primitives";
import { IconButton } from "../components/button";
import { Icons } from "../icons";

const MIN_SCALE = 0.25;
const MAX_SCALE = 8;
const STEP = 1.4;

interface Transform {
  scale: number;
  x: number;
  y: number;
}

/**
 * Full-panel image preview. Mounted on its own container rather than inside the
 * stash list, so an incoming STASHES re-render cannot tear it out mid-view.
 */
export function openLightbox(container: HTMLElement, src: string, fileName: string): void {
  const restoreFocus = document.activeElement as HTMLElement | null;

  const img = h("img", "pstash-lb-img") as HTMLImageElement;
  img.src = src;
  img.alt = fileName;
  img.draggable = false;

  const stage = h("div", "pstash-lb-stage", img);
  const zoomLabel = h("span", "pstash-lb-zoom", "100%");
  const dimsLabel = h("span", "pstash-lb-dims", "");

  const view: Transform = { scale: 1, x: 0, y: 0 };

  /** Keeps the image overlapping the stage, so it can never be panned away. */
  function clamp(): void {
    const maxX = Math.max(0, (img.offsetWidth * view.scale - stage.clientWidth) / 2);
    const maxY = Math.max(0, (img.offsetHeight * view.scale - stage.clientHeight) / 2);
    view.x = Math.min(maxX, Math.max(-maxX, view.x));
    view.y = Math.min(maxY, Math.max(-maxY, view.y));
  }

  function apply(): void {
    clamp();
    img.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    zoomLabel.textContent = `${Math.round(view.scale * 100)}%`;
    stage.classList.toggle("is-zoomed", view.scale > 1);
  }

  /**
   * Scales about a point in stage coordinates, so wheel and double-click zoom
   * keep whatever is under the pointer under the pointer.
   */
  function zoomAbout(nextScale: number, pointX = 0, pointY = 0): void {
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
    if (scale === view.scale) return;
    // Where the anchor sits in the image's own space, before and after.
    const imageX = (pointX - view.x) / view.scale;
    const imageY = (pointY - view.y) / view.scale;
    view.x = pointX - imageX * scale;
    view.y = pointY - imageY * scale;
    view.scale = scale;
    apply();
  }

  function stagePoint(clientX: number, clientY: number): [number, number] {
    const rect = stage.getBoundingClientRect();
    return [clientX - (rect.left + rect.width / 2), clientY - (rect.top + rect.height / 2)];
  }

  function reset(): void {
    view.scale = 1;
    view.x = 0;
    view.y = 0;
    apply();
  }

  const close = (): void => {
    document.removeEventListener("keydown", onKeyDown, true);
    root.remove();
    restoreFocus?.focus?.();
  };

  function onKeyDown(event: KeyboardEvent): void {
    const keys: Record<string, () => void> = {
      Escape: close,
      "+": () => zoomAbout(view.scale * STEP),
      "=": () => zoomAbout(view.scale * STEP),
      "-": () => zoomAbout(view.scale / STEP),
      "0": reset,
    };
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    action();
  }

  const closeButton = IconButton({ iconSvg: Icons.close, title: "Close (Esc)", onClick: close });

  const bar = h("div", "pstash-lb-bar");
  mount(
    bar,
    IconButton({
      iconSvg: Icons.zoomOut,
      title: "Zoom out (−)",
      onClick: () => zoomAbout(view.scale / STEP),
    }),
    zoomLabel,
    IconButton({
      iconSvg: Icons.zoomIn,
      title: "Zoom in (+)",
      onClick: () => zoomAbout(view.scale * STEP),
    }),
    IconButton({ iconSvg: Icons.fit, title: "Reset to fit (0)", onClick: reset })
  );

  const head = h("div", "pstash-lb-head");
  mount(head, h("span", "pstash-lb-name", fileName), dimsLabel, closeButton);

  const root = h("div", "pstash-lb");
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", `Preview of ${fileName}`);
  mount(root, head, stage, bar);

  // Clicking the backdrop dismisses; clicks on the image itself must not.
  stage.addEventListener("click", (event) => {
    if (event.target === stage) close();
  });

  stage.addEventListener("wheel", (event: WheelEvent) => {
    event.preventDefault();
    const [px, py] = stagePoint(event.clientX, event.clientY);
    zoomAbout(view.scale * (event.deltaY < 0 ? STEP : 1 / STEP), px, py);
  }, { passive: false });

  img.addEventListener("dblclick", (event: MouseEvent) => {
    const [px, py] = stagePoint(event.clientX, event.clientY);
    if (view.scale > 1) reset();
    else zoomAbout(2, px, py);
  });

  // Drag to pan, but only once there is something to pan to.
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  img.addEventListener("pointerdown", (event: PointerEvent) => {
    if (view.scale <= 1) return;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    stage.classList.add("is-panning");
    // Capture keeps the drag alive past the image edge, but it throws if the
    // pointer is not currently active — never at the cost of the drag itself.
    try {
      img.setPointerCapture(event.pointerId);
    } catch {
      /* drag still works, it just ends early if the pointer leaves the image */
    }
  });

  img.addEventListener("pointermove", (event: PointerEvent) => {
    if (!dragging) return;
    view.x += event.clientX - lastX;
    view.y += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    apply();
  });

  const endDrag = (event: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove("is-panning");
    try {
      img.releasePointerCapture(event.pointerId);
    } catch {
      /* capture was never taken */
    }
  };
  img.addEventListener("pointerup", endDrag);
  img.addEventListener("pointercancel", endDrag);

  img.addEventListener("load", () => {
    dimsLabel.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
    apply();
  });
  img.addEventListener("error", () => {
    dimsLabel.textContent = "could not be loaded";
  });

  // Captured, so Escape closes the preview before anything else reacts to it.
  document.addEventListener("keydown", onKeyDown, true);

  container.replaceChildren(root);
  closeButton.focus();
  apply();
}
