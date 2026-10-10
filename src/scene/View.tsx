import { useEffect, useMemo, useRef } from "react";
import { createPortal, useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Slot } from "./state";

/* Vlastní obdoba drei <View>: každá ukázka má svou scénu a kameru
   a kreslí se nůžkami do obdélníku svého DOM prvku. Mimo obraz se nekreslí. */

export type Cam = { fov: number; pos: [number, number, number]; look: [number, number, number] };

/* Průhlednost DOM obalu, který prvek odhaluje (.rv karta nebo [data-in] v hero).
   Dokud obal není vidět, 3D se nekreslí; během jeho prolnutí se prolíná i 3D. */
function revealOpacity(fade: HTMLElement) {
  const cs = getComputedStyle(fade);
  if (cs.visibility === "hidden") return 0;
  return parseFloat(cs.opacity);
}

/* Nastaví průhlednost všem materiálům scény (jen během prolínání, pak vrátí původní stav). */
function applyAlpha(scene: THREE.Scene, a: number) {
  scene.traverse((o) => {
    const mats = (o as THREE.Mesh).material;
    if (!mats) return;
    for (const m of Array.isArray(mats) ? mats : [mats]) {
      const u = m.userData as { op?: number; tr?: boolean };
      if (u.op === undefined) {
        u.op = m.opacity;
        u.tr = m.transparent;
      }
      if (a >= 1) {
        m.opacity = u.op;
        m.transparent = u.tr!;
      } else {
        m.transparent = true;
        m.opacity = u.op * a;
      }
    }
  });
}

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

function setTransparent(scene: THREE.Scene, on: boolean) {
  scene.traverse((o) => {
    const mats = (o as THREE.Mesh).material;
    if (!mats) return;
    for (const m of Array.isArray(mats) ? mats : [mats]) {
      const u = m.userData as { tr0?: boolean };
      if (u.tr0 === undefined) u.tr0 = m.transparent;
      m.transparent = on ? true : u.tr0;
    }
  });
}

/* Připraví scénu před prvním zobrazením: nahraje textury, zkompiluje shadery (i průhlednou variantu
   pro prolínání) a jednou ji doopravdy vykreslí do jednoho pixelu, aby se dolinkovalo i to, co compileAsync vynechá.
   Skryté objekty se na tu chvíli zviditelní, compile jinak prochází jen viditelné. */
export async function prepareScene(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, fade = true) {
  const hidden: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (!o.visible) {
      hidden.push(o);
      o.visible = true;
    }
    const mats = (o as THREE.Mesh).material;
    if (!mats) return;
    for (const m of Array.isArray(mats) ? mats : [mats]) {
      const map = (m as THREE.MeshStandardMaterial).map;
      if (map) gl.initTexture(map);
    }
  });
  try {
    if (fade) {
      setTransparent(scene, true);
      await gl.compileAsync(scene, camera);
      setTransparent(scene, false);
    }
    await gl.compileAsync(scene, camera);
    // jedno skutečné vykreslení do rohového pixelu plátna: dolinkuje programy přesně ve variantě pro obrazovku
    // (do pomocné textury by se kompilovaly jiné varianty, bez tone mappingu, a ty pravé až při prvním snímku)
    const vp = gl.getViewport(new THREE.Vector4());
    gl.setViewport(0, 0, 1, 1);
    gl.setScissor(0, 0, 1, 1);
    gl.setScissorTest(true);
    gl.render(scene, camera);
    gl.setScissorTest(false);
    gl.setViewport(vp);
  } finally {
    hidden.forEach((o) => (o.visible = false));
  }
}

/* fade={false}: scéna se neprolíná přes materiály (odhalení řeší stránka), ušetří to průhledné varianty shaderů. */
export function View({ slot, cam, children, onReady, fade = true }: { slot: Slot; cam: Cam; children: React.ReactNode; onReady?: () => void; fade?: boolean }) {
  const gl = useThree((s) => s.gl);
  const scene = useMemo(() => new THREE.Scene(), []);
  const camera = useMemo(() => {
    const c = new THREE.PerspectiveCamera(cam.fov, 1, 0.1, 60);
    c.position.set(...cam.pos);
    c.lookAt(...cam.look);
    return c;
  }, [cam]);
  const fx = useRef({ fade: undefined as HTMLElement | null | undefined, born: -1, full: false });

  // po připojení se scéna sama připraví; kreslit se začne, až je hotová
  const ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => {
    let alive = true;
    // dva snímky, ať jsou portál a materiály opravdu v grafu scény
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        prepareScene(gl, scene, camera, fade)
          .catch(() => {})
          .finally(() => {
            if (!alive) return;
            slot.ready = true;
            ready.current?.();
          });
      })
    );
    return () => void (alive = false);
  }, [gl, scene, camera, slot, fade]);

  useFrame(({ gl, size, clock }) => {
    const el = slot.ref.current;
    if (!el || !slot.ready) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.bottom < 0 || r.top > size.height || r.right < 0 || r.left > size.width) return;

    // průhlednost: obal odhalení × jemný náběh při prvním zobrazení
    const f = fx.current;
    if (f.fade === undefined) f.fade = fade ? el.closest<HTMLElement>(".rv, [data-in]") : null;
    let a = 1;
    if (f.fade) {
      a = revealOpacity(f.fade);
      // obal je plně odhalený natrvalo, dál už ho číst nemusíme
      if (a >= 0.999 && (!f.fade.classList.contains("rv") || f.fade.classList.contains("in"))) f.fade = null;
    }
    if (a <= 0.001) {
      slot.alpha = 0;
      return;
    }
    if (f.born < 0) f.born = clock.elapsedTime;
    if (fade) a *= smooth((clock.elapsedTime - f.born) / 0.6);
    slot.alpha = a;
    if (a < 0.999) {
      applyAlpha(scene, a);
      f.full = false;
    } else if (!f.full) {
      applyAlpha(scene, 1);
      f.full = true;
    }

    const aspect = r.width / r.height;
    if (camera.aspect !== aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    const bottom = size.height - r.bottom;
    gl.setViewport(r.left, bottom, r.width, r.height);
    gl.setScissor(r.left, bottom, r.width, r.height);
    gl.setScissorTest(true);
    gl.render(scene, camera);
    gl.setScissorTest(false);
  }, 1);

  return createPortal(children, scene, { camera });
}

/* Zaoblený kvádr (náhrada drei RoundedBox). */
export function RoundedBox({
  args,
  radius = 0.05,
  smoothness = 3,
  children,
  ...rest
}: { args: [number, number, number]; radius?: number; smoothness?: number } & Omit<ThreeElements["mesh"], "args">) {
  const geo = useMemo(() => new RoundedBoxGeometry(args[0], args[1], args[2], smoothness, radius), [args[0], args[1], args[2], radius, smoothness]);
  return (
    <mesh geometry={geo} {...rest}>
      {children}
    </mesh>
  );
}
