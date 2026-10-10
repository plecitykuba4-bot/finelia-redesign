import { useLayoutEffect, useMemo } from "react";
import { useThree, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { controls } from "./state";

/* Lehké „studio“ pro odlesky: šedá místnost a čtyři světelné panely, všechno z jednoho jednoduchého
   materiálu. RoomEnvironment z three kompiluje víc programů a na Windows trvala přes sekundu. */
function studio() {
  const s = new THREE.Scene();
  const box = new THREE.BoxGeometry();
  const add = (color: string, k: number, pos: [number, number, number], scale: [number, number, number]) => {
    const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.scale.set(...scale);
    s.add(m);
  };
  add("#9aa19e", 1, [0, 0, 0], [12, 10, 12]); // místnost
  add("#ffffff", 16, [0, 4.9, 0], [7, 0.1, 7]); // strop
  add("#ffffff", 7, [-5.9, 1, 0], [0.1, 5, 6]); // okno vlevo
  add("#ffffff", 4, [5.9, 2, 1.5], [0.1, 3, 4]); // panel vpravo
  add("#ffffff", 5, [0, 1, 5.9], [6, 4, 0.1]); // panel za kamerou
  return s;
}

/* Prostředí pro odlesky, jedno na každý WebGL kontext (na desktopu je kontext jeden pro všechny views,
   na mobilu má každý rámeček vlastní; textura z PMREM jinému kontextu nepatří). */
const envByGl = new WeakMap<THREE.WebGLRenderer, THREE.Texture>();
const ENV_SIZE = 64;
// studio svítí víc než dřívější RoomEnvironment; tímhle se vrací na původní jas scén
const ENV_GAIN = 0.27;

/* Odlesky jsou předpočítané v public/env.bin (hlavička šířka, výška; pak pixely RGBE).
   Soubor vyrobí nastroje/prohlizec/upec-env.mjs z funkce bakeEnv níže. */
let baked: THREE.DataTexture | null = null;

function decodeEnv(buf: ArrayBuffer) {
  const dv = new DataView(buf);
  const w = dv.getUint32(0, true), h = dv.getUint32(4, true);
  const src = new Uint8Array(buf, 8);
  const out = new Uint16Array(w * h * 4);
  const half = THREE.DataUtils.toHalfFloat;
  const one = half(1);
  for (let i = 0; i < w * h; i++) {
    const e = src[i * 4 + 3];
    const f = e ? Math.pow(2, e - 136) : 0;
    out[i * 4] = half(Math.min(src[i * 4] * f, 60000));
    out[i * 4 + 1] = half(Math.min(src[i * 4 + 1] * f, 60000));
    out[i * 4 + 2] = half(Math.min(src[i * 4 + 2] * f, 60000));
    out[i * 4 + 3] = one;
  }
  const t = new THREE.DataTexture(out, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
  t.mapping = THREE.CubeUVReflectionMapping;
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.LinearSRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

export const envReady: Promise<void> = fetch("/env.bin")
  .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
  .then((buf) => void (baked = decodeEnv(buf)))
  .catch(() => {});

/* Jen pro vývoj: spočítá odlesky a vrátí je jako base64 (RGBE), aby šly uložit do souboru. */
function bakeEnv(gl: THREE.WebGLRenderer) {
  const pm = new THREE.PMREMGenerator(gl);
  const rt = pm.fromScene(studio(), 0, 0.1, 100, { size: ENV_SIZE });
  const w = rt.width, h = rt.height;
  const px = new Uint16Array(w * h * 4);
  gl.readRenderTargetPixels(rt, 0, 0, w, h, px);
  pm.dispose();
  const out = new Uint8Array(8 + w * h * 4);
  new DataView(out.buffer).setUint32(0, w, true);
  new DataView(out.buffer).setUint32(4, h, true);
  const f = THREE.DataUtils.fromHalfFloat;
  for (let i = 0; i < w * h; i++) {
    const r = f(px[i * 4]), g = f(px[i * 4 + 1]), b = f(px[i * 4 + 2]);
    const m = Math.max(r, g, b);
    if (m < 1e-30) continue;
    const e = Math.ceil(Math.log2(m));
    const k = 256 / Math.pow(2, e);
    const o = 8 + i * 4;
    out[o] = Math.min(255, Math.round(r * k));
    out[o + 1] = Math.min(255, Math.round(g * k));
    out[o + 2] = Math.min(255, Math.round(b * k));
    out[o + 3] = e + 128;
  }
  let bin = "";
  for (let i = 0; i < out.length; i += 8192) bin += String.fromCharCode(...out.subarray(i, i + 8192));
  return btoa(bin);
}

export function Env({ intensity = 0.5, shadow = false }: { intensity?: number; shadow?: boolean }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    // předpočítané odlesky ze souboru nestojí za běhu nic; výpočet PMREM je jen záloha
    let envTex: THREE.Texture | undefined = baked ?? envByGl.get(gl);
    if (!envTex) {
      const pm = new THREE.PMREMGenerator(gl);
      envTex = pm.fromScene(studio(), 0, 0.1, 100, { size: ENV_SIZE }).texture;
      pm.dispose();
      envByGl.set(gl, envTex);
    }
    if (import.meta.env.DEV) (window as unknown as { __bakeEnv?: () => string }).__bakeEnv = () => bakeEnv(gl);
    scene.environment = envTex;
    scene.environmentIntensity = intensity * ENV_GAIN;
  }, [gl, scene, intensity]);
  return (
    <>
      <ambientLight intensity={0.35} />
      {/* stejná sada světel ve všech scénách (sdílené programy); stín vrhá jen scéna, která si o něj řekne */}
      <directionalLight
        position={shadow ? [3.5, 8, 3] : [3, 5, 4]}
        intensity={1.3}
        castShadow={shadow}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={1}
        shadow-camera-far={20}
        shadow-bias={-0.0006}
        shadow-radius={7}
      />
    </>
  );
}

/* Měkký stín jako rozmazaná skvrna (ContactShadows při pohybu dělá artefakty). */
let blobTex: THREE.Texture | null = null;
function blob() {
  if (blobTex) return blobTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(14,38,36,0.55)");
  gr.addColorStop(0.45, "rgba(14,38,36,0.22)");
  gr.addColorStop(1, "rgba(14,38,36,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  blobTex = new THREE.CanvasTexture(c);
  return blobTex;
}

export function Blob({ w = 2, d = 1, y = 0, opacity = 1, ...rest }: { w?: number; d?: number; y?: number; opacity?: number } & ThreeElements["mesh"]) {
  const map = useMemo(blob, []);
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={y} scale={[w, d, 1]} renderOrder={-1} {...rest}>
      <planeGeometry />
      <meshBasicMaterial map={map} transparent depthWrite={false} opacity={opacity} />
    </mesh>
  );
}

/* Dokumenty kreslené do canvasu. Texty jsou dekorace, čitelný obsah je v HTML. */
export type DocKind = "faktura" | "vypis" | "paska" | "dph" | "smlouva" | "prehled" | "priznani";

const DOCS: Record<DocKind, { title: string; no: string; rows: [string, string][]; total?: [string, string] }> = {
  faktura: {
    title: "FAKTURA",
    no: "2026-0148",
    rows: [["Konzultace", "4 500,00"], ["Zpracování podkladů", "2 200,00"], ["Doprava", "380,00"], ["DPH 21 %", "1 486,80"]],
    total: ["Celkem", "8 566,80 Kč"],
  },
  vypis: {
    title: "VÝPIS Z ÚČTU",
    no: "09 / 2026",
    rows: [["Počáteční zůstatek", "184 210,00"], ["Příjmy", "+ 96 400,00"], ["Výdaje", "− 71 935,50"], ["Poplatky", "− 120,00"]],
    total: ["Konečný zůstatek", "208 554,50"],
  },
  paska: {
    title: "VÝPLATNÍ PÁSKA",
    no: "září 2026",
    rows: [["Hrubá mzda", "48 000"], ["Sociální pojištění", "− 3 408"], ["Zdravotní pojištění", "− 2 160"], ["Záloha na daň", "− 4 630"]],
    total: ["K výplatě", "37 802 Kč"],
  },
  dph: {
    title: "PŘIZNÁNÍ K DPH",
    no: "Q3 / 2026",
    rows: [["Řádek 1", "120 400"], ["Řádek 40", "18 230"], ["Řádek 62", "25 284"], ["Řádek 64", "7 054"]],
    total: ["Vlastní daňová povinnost", "7 054"],
  },
  smlouva: {
    title: "SMLOUVA",
    no: "o vedení účetnictví",
    rows: [["Článek I.", "Předmět"], ["Článek II.", "Rozsah"], ["Článek III.", "Termíny"], ["Článek IV.", "Cena"]],
  },
  prehled: {
    title: "PŘEHLED OSVČ",
    no: "za rok 2025",
    rows: [["Příjmy", "612 000"], ["Výdaje", "367 200"], ["Vyměřovací základ", "122 400"], ["Zálohy", "54 072"]],
    total: ["Doplatek", "0"],
  },
  priznani: {
    title: "DAŇOVÉ PŘIZNÁNÍ",
    no: "DPFO 2025",
    rows: [["Oddíl 2", "244 800"], ["Oddíl 4", "36 720"], ["Sleva na poplatníka", "− 30 840"], ["Zálohy", "− 4 200"]],
    total: ["Daň k úhradě", "1 680 Kč"],
  },
};

const SANS = '"Hanken Grotesk Variable", system-ui, sans-serif';
const MONO = '"Geist Mono Variable", ui-monospace, monospace';

function drawDoc(g: CanvasRenderingContext2D, kind: DocKind, W: number, H: number) {
  const d = DOCS[kind];
  const s = W / 512;
  g.fillStyle = controls.paper;
  g.fillRect(0, 0, W, H);
  g.fillStyle = controls.teal;
  g.fillRect(40 * s, 46 * s, 30 * s, 30 * s);
  g.fillStyle = controls.ink;
  g.font = `700 ${34 * s}px ${SANS}`;
  g.fillText(d.title, 40 * s, 128 * s);
  g.fillStyle = "#6b7976";
  g.font = `500 ${18 * s}px ${MONO}`;
  g.fillText(d.no, 40 * s, 160 * s);
  // adresní bloky
  g.fillStyle = "#d9dfdc";
  for (let i = 0; i < 3; i++) {
    g.fillRect(40 * s, (200 + i * 20) * s, (150 - i * 30) * s, 9 * s);
    g.fillRect(290 * s, (200 + i * 20) * s, (170 - i * 25) * s, 9 * s);
  }
  // tabulka
  let y = 300 * s;
  g.strokeStyle = "#e3e7e5";
  g.lineWidth = 2 * s;
  for (const [l, r] of d.rows) {
    g.beginPath();
    g.moveTo(40 * s, y - 34 * s);
    g.lineTo(W - 40 * s, y - 34 * s);
    g.stroke();
    g.fillStyle = "#33433f";
    g.font = `500 ${19 * s}px ${SANS}`;
    g.fillText(l, 40 * s, y);
    g.font = `500 ${18 * s}px ${MONO}`;
    g.textAlign = "right";
    g.fillText(r, W - 40 * s, y);
    g.textAlign = "left";
    y += 58 * s;
  }
  if (d.total) {
    g.fillStyle = "#e6f4f0";
    g.fillRect(28 * s, y - 26 * s, W - 56 * s, 66 * s);
    g.fillStyle = controls.ink;
    g.font = `700 ${20 * s}px ${SANS}`;
    g.fillText(d.total[0], 40 * s, y + 14 * s);
    g.font = `700 ${21 * s}px ${MONO}`;
    g.textAlign = "right";
    g.fillText(d.total[1], W - 40 * s, y + 14 * s);
    g.textAlign = "left";
  } else {
    g.fillStyle = "#d9dfdc";
    for (let i = 0; i < 5; i++) g.fillRect(40 * s, y + i * 24 * s, (420 - (i % 3) * 60) * s, 9 * s);
  }
  // podpis
  g.strokeStyle = "#9aa8a4";
  g.lineWidth = 2 * s;
  g.beginPath();
  g.moveTo(300 * s, H - 70 * s);
  g.bezierCurveTo(330 * s, H - 110 * s, 350 * s, H - 40 * s, 380 * s, H - 85 * s);
  g.bezierCurveTo(395 * s, H - 100 * s, 410 * s, H - 70 * s, 440 * s, H - 80 * s);
  g.stroke();
}

const docCache = new Map<DocKind, THREE.CanvasTexture>();

export function docTexture(kind: DocKind, gl?: THREE.WebGLRenderer) {
  const hit = docCache.get(kind);
  if (hit) return hit;
  const W = 512, H = 724;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  drawDoc(g, kind, W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = gl ? Math.min(8, gl.capabilities.getMaxAnisotropy()) : 4;
  // písmo se mohlo dočíst až po prvním kreslení
  document.fonts?.ready.then(() => {
    drawDoc(g, kind, W, H);
    t.needsUpdate = true;
  });
  docCache.set(kind, t);
  return t;
}

/* Kulatá pečeť s fajfkou (pro razítko a potvrzení). */
let tickTex: THREE.Texture | null = null;
export function tickTexture() {
  if (tickTex) return tickTex;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = controls.teal;
  g.beginPath();
  g.arc(128, 128, 120, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#ffffff";
  g.lineWidth = 26;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(74, 132);
  g.lineTo(112, 170);
  g.lineTo(184, 94);
  g.stroke();
  tickTex = new THREE.CanvasTexture(c);
  tickTex.colorSpace = THREE.SRGBColorSpace;
  return tickTex;
}

/* Otisk razítka: kruh s nápisem. */
let stampTex: THREE.Texture | null = null;
export function stampTexture() {
  if (stampTex) return stampTex;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.strokeStyle = controls.teal;
  g.fillStyle = controls.teal;
  g.lineWidth = 12;
  g.beginPath();
  g.arc(128, 128, 112, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 4;
  g.beginPath();
  g.arc(128, 128, 92, 0, Math.PI * 2);
  g.stroke();
  g.font = `800 34px ${SANS}`;
  g.textAlign = "center";
  g.fillText("PODÁNO", 128, 122);
  g.font = `600 22px ${MONO}`;
  g.fillText("FINELIA", 128, 158);
  stampTex = new THREE.CanvasTexture(c);
  stampTex.colorSpace = THREE.SRGBColorSpace;
  return stampTex;
}

/* Pružina: kritické tlumení, nezávislé na snímkové frekvenci. */
export function damp(cur: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(cur, target, lambda, dt);
}

export const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
