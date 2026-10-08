import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let lenis: Lenis | null = null;

export function startSmoothScroll() {
  if (reducedMotion() || lenis) return lenis;
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.95 });
  lenis.on("scroll", ScrollTrigger.update);
  // Lenis běží na tickeru GSAPu, jinak se s ScrollTriggerem perou o snímky
  gsap.ticker.add((t) => lenis?.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function scrollToHash(hash: string) {
  const el = document.querySelector(hash);
  if (!el) return;
  if (lenis) lenis.scrollTo(el as HTMLElement, { offset: -72, duration: 1.4 });
  else el.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" });
}

/* Prvky s .rv vyjedou při vstupu do obrazu (třída .in řeší CSS). */
export function revealOnView(root: ParentNode = document) {
  const els = root.querySelectorAll<HTMLElement>(".rv:not(.in)");
  if (reducedMotion() || !("IntersectionObserver" in window)) {
    els.forEach((e) => e.classList.add("in"));
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }),
    { rootMargin: "0px 0px -10% 0px" }
  );
  els.forEach((e) => io.observe(e));
  return () => io.disconnect();
}

export { gsap, ScrollTrigger };
