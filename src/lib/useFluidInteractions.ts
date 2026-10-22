import { useEffect } from "react";

export function useFluidInteractions(view: string, adminSection: string, adminOpen: boolean) {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const overlays = new Set<HTMLElement>();
    const cleanups = new Set<ReturnType<typeof setTimeout>>();
    const ripple = (event: PointerEvent) => {
      if (reduced.matches || (event.pointerType === "mouse" && event.button !== 0)) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('button, a[href], [role="button"], .upload-action') : null;
      if (!target || target.matches(':disabled, [aria-disabled="true"]') || target.closest('fieldset:disabled')) return;
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const overlay = document.createElement("span");
      overlay.className = "fluid-ripple-clip"; overlay.setAttribute("aria-hidden", "true");
      Object.assign(overlay.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, borderRadius: getComputedStyle(target).borderRadius });
      const wave = document.createElement("span"); wave.className = "fluid-ripple-wave";
      const diameter = Math.hypot(rect.width, rect.height) * 2;
      Object.assign(wave.style, { width: `${diameter}px`, height: `${diameter}px`, left: `${event.clientX - rect.left - diameter/2}px`, top: `${event.clientY - rect.top - diameter/2}px` });
      overlay.append(wave); document.body.append(overlay); overlays.add(overlay);
      const remove = () => { overlay.remove(); overlays.delete(overlay); clearTimeout(timer); cleanups.delete(timer); };
      const timer = setTimeout(remove, 650); cleanups.add(timer);
      wave.addEventListener("animationend", remove, { once: true });
    };
    const keyboard = (event: MouseEvent) => {
      if (reduced.matches || event.detail !== 0) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('button, a[href], [role="button"]') : null;
      if (!target || target.matches(':disabled, [aria-disabled="true"]')) return;
      target.animate?.([{ scale: "0.97" }, { scale: "1" }], { duration: 200, easing: "cubic-bezier(.2,.8,.2,1)" });
    };
    const clear = () => { overlays.forEach(item => item.remove()); overlays.clear(); cleanups.forEach(clearTimeout); cleanups.clear(); };
    const preferenceChanged = () => { if (reduced.matches) clear(); };
    document.addEventListener("pointerdown", ripple, { passive: true }); document.addEventListener("click", keyboard);
    window.addEventListener("scroll", clear, true); reduced.addEventListener("change", preferenceChanged);
    return () => { clear(); document.removeEventListener("pointerdown", ripple); document.removeEventListener("click", keyboard); window.removeEventListener("scroll", clear, true); reduced.removeEventListener("change", preferenceChanged); };
  }, []);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const nodes = adminOpen ? document.querySelectorAll(".dashboard-content > :not(.dashboard-top)") : document.querySelectorAll("main > section");
    const animations = [...nodes].map(node => node.animate?.([{ opacity: 0.55, translate: "0 7px" }, { opacity: 1, translate: "0 0" }], { duration: 230, easing: "cubic-bezier(.2,.8,.2,1)" }));
    return () => animations.forEach(animation => animation?.cancel());
  }, [view, adminSection, adminOpen]);
}
