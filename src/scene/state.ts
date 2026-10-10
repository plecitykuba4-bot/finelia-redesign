/* Sdílený stav mezi stránkou a 3D. Stránka zapisuje vstupy (kurzor, hover, scroll),
   scény z nich v rAF smyčce počítají pohyb. Bez importu three, aby zůstal v líném chunku. */

export type Slot = {
  ref: { current: HTMLElement | null };
  mx: number; // kurzor v prvku, -1..1
  my: number;
  hover: boolean;
  alpha: number; // jak moc je 3D právě vidět (0..1), zapisuje View
  ready: boolean; // shadery scény jsou zkompilované, smí se kreslit
};

const slot = (): Slot => ({ ref: { current: null }, mx: 0, my: 0, hover: false, alpha: 0, ready: false });

export const slots = {
  hero: slot(),
  icons: [slot(), slot(), slot(), slot()],
  papers: slot(),
  moments: [slot(), slot(), slot()],
};

export const scene = {
  reduced: false,
  heroOut: 0, // 0..1, jak daleko odjel hero
  steps: 0, // 0..3, průběh sekce Spolupráce
};

/* Naladěné vizuální parametry na jednom místě. */
export const controls = {
  teal: "#0b9884",
  tealDeep: "#086b5d",
  ink: "#0e2624",
  mint: "#9fdccf",
  paper: "#fbfbf9",
  tilt: 0.35, // jak moc se štít natáčí za kurzorem
  sway: 0.3, // rozkmit stálého kývání štítu (rad)
  spring: 0.085, // tuhost pružiny papírů
};

/* Kurzor do slotů: jeden posluchač, souřadnice relativně k prvku. */
export function trackPointer() {
  const all = () => [slots.hero, slots.papers, ...slots.icons];
  const move = (e: PointerEvent) => {
    for (const s of all()) {
      const el = s.ref.current;
      if (!el) continue;
      const r = el.getBoundingClientRect();
      s.mx = Math.max(-1.5, Math.min(1.5, ((e.clientX - r.left) / r.width) * 2 - 1));
      s.my = Math.max(-1.5, Math.min(1.5, -(((e.clientY - r.top) / r.height) * 2 - 1)));
    }
  };
  addEventListener("pointermove", move, { passive: true });
  return () => removeEventListener("pointermove", move);
}
