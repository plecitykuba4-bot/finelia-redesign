import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { controls, scene, slots } from "./state";
import { Env } from "./shared";
import { RoundedBox, type Cam } from "./View";

/* Tři malé smyčky do karet „Momenty podnikání“ (tmavá sekce).
   Běží pořád samy, najetí na kartu je jen zrychlí. */

const damp = THREE.MathUtils.damp;

function useSpeed(i: number) {
  const v = useRef(1);
  return (dt: number) => (v.current = damp(v.current, slots.moments[i].hover ? 2.6 : 1, 4, dt));
}

/* Líc mince: štít Finelia na světlém kruhu se dvěma linkami. */
function coinFace(gl: THREE.WebGLRenderer) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#e9efed";
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#b9c6c2";
  g.lineWidth = 10;
  g.beginPath();
  g.arc(256, 256, 226, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 3;
  g.beginPath();
  g.arc(256, 256, 200, 0, Math.PI * 2);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
  // víčko válce má osu v po hloubce, po natočení mince ji srovnáme na svislici
  t.center.set(0.5, 0.5);
  t.rotation = Math.PI / 2;
  const img = new Image();
  img.onload = () => {
    const h = 250, w = (img.width / img.height) * h;
    g.drawImage(img, 256 - w / 2, 256 - h / 2 - 4, w, h);
    t.needsUpdate = true;
  };
  img.src = "/img/shield.png";
  return t;
}

export function Coin() {
  const gl = useThree((s) => s.gl);
  const ref = useRef<THREE.Group>(null);
  const speed = useSpeed(0);
  const mats = useMemo(() => {
    const face = new THREE.MeshPhysicalMaterial({ map: coinFace(gl), metalness: 0.55, roughness: 0.32, clearcoat: 0.8 });
    const edge = new THREE.MeshPhysicalMaterial({ color: "#c7d2cf", metalness: 0.85, roughness: 0.28 });
    return [edge, face, face];
  }, [gl]);
  const angle = useRef(0);
  useFrame((st, dt) => {
    dt = Math.min(dt, 0.05);
    const t = st.clock.elapsedTime;
    if (!scene.reduced) angle.current += dt * 1.1 * speed(dt);
    const g = ref.current!;
    g.rotation.y = scene.reduced ? 0.4 : angle.current;
    g.position.y = scene.reduced ? 0 : Math.sin(t * 1.2) * 0.07;
  });
  return (
    <>
      <Env intensity={0.7} />
      <group ref={ref}>
        <mesh material={mats} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[1, 1, 0.16, 96]} />
        </mesh>
      </group>
    </>
  );
}

/* Cedulka nad vchodem. */
function signTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 80;
  const g = c.getContext("2d")!;
  g.fillStyle = controls.teal;
  g.fillRect(0, 0, 256, 80);
  g.fillStyle = "#ffffff";
  g.font = '700 46px "Hanken Grotesk Variable", system-ui, sans-serif';
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("s.r.o.", 128, 42);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  document.fonts?.ready.then(() => {
    g.fillStyle = controls.teal;
    g.fillRect(0, 0, 256, 80);
    g.fillStyle = "#ffffff";
    g.fillText("s.r.o.", 128, 42);
    t.needsUpdate = true;
  });
  return t;
}

const BW = 1.25, BH = 1.7, BD = 0.95;
const DARK = new THREE.Color("#1c3b37");
const LIT = new THREE.Color("#cdf8ec");

/* Založení společnosti: budova firmy s cedulkou „s.r.o.“. Otáčí se a v oknech se postupně rozsvěcuje,
   po najetí se rozsvítí celá. */
export function Building() {
  const ref = useRef<THREE.Group>(null);
  const win = useRef<THREE.InstancedMesh>(null);
  const speed = useSpeed(1);
  const a = useRef(0.5);
  const lit = useRef(0);
  const sign = useMemo(signTexture, []);
  // okna: přední a zadní stěna 3×4 (v přízemí vpředu místo prostředního okna dveře), boky 2×4
  const slots3 = useMemo(() => {
    const out: { m: THREE.Matrix4; ph: number }[] = [];
    const o = new THREE.Object3D();
    const add = (x: number, y: number, z: number, ry: number) => {
      o.position.set(x, y, z);
      o.rotation.set(0, ry, 0);
      o.updateMatrix();
      out.push({ m: o.matrix.clone(), ph: out.length * 2.399 });
    };
    for (let r = 0; r < 4; r++) {
      const y = 0.32 + r * 0.37;
      for (let c = 0; c < 3; c++) {
        const x = (c - 1) * 0.36;
        if (!(r === 0 && c === 1)) add(x, y, BD / 2 + 0.003, 0);
        add(x, y, -BD / 2 - 0.003, Math.PI);
      }
      for (let c = 0; c < 2; c++) {
        const z = (c - 0.5) * 0.38;
        add(BW / 2 + 0.003, y, z, Math.PI / 2);
        add(-BW / 2 - 0.003, y, z, -Math.PI / 2);
      }
    }
    return out;
  }, []);
  const col = useMemo(() => new THREE.Color(), []);
  useFrame((st, dt) => {
    dt = Math.min(dt, 0.05);
    const t = st.clock.elapsedTime;
    if (!scene.reduced) a.current += dt * 0.42 * speed(dt);
    ref.current!.rotation.y = a.current;
    lit.current = damp(lit.current, slots.moments[1].hover ? 1 : 0, 4, dt);
    const w = win.current!;
    slots3.forEach((s, i) => {
      // každé okno má vlastní rytmus; svítí zhruba třetina
      const on = scene.reduced ? (i % 3 === 0 ? 1 : 0) : Math.min(1, Math.max(0, (Math.sin(t * 0.55 + s.ph) - 0.35) * 4));
      w.setColorAt(i, col.copy(DARK).lerp(LIT, Math.max(on, lit.current)));
    });
    if (w.instanceColor) w.instanceColor.needsUpdate = true;
  });
  return (
    <>
      <Env intensity={0.7} />
      <group ref={ref} position-y={-0.98}>
        <mesh position-y={0.025}>
          <cylinderGeometry args={[1.05, 1.05, 0.05, 56]} />
          <meshStandardMaterial color="#d7e0dd" roughness={0.8} />
        </mesh>
        <RoundedBox args={[BW, BH, BD]} radius={0.03} smoothness={3} position-y={0.05 + BH / 2}>
          <meshPhysicalMaterial color="#eef2f0" roughness={0.55} clearcoat={0.3} />
        </RoundedBox>
        <RoundedBox args={[BW + 0.1, 0.09, BD + 0.1]} radius={0.03} smoothness={3} position-y={0.05 + BH + 0.045}>
          <meshPhysicalMaterial color={controls.teal} roughness={0.35} clearcoat={0.7} />
        </RoundedBox>
        <group position-y={0.05}>
          <instancedMesh
            ref={win}
            args={[undefined, undefined, slots3.length]}
            onUpdate={(m) => {
              slots3.forEach((s, i) => {
                m.setMatrixAt(i, s.m);
                m.setColorAt(i, DARK);
              });
              m.instanceMatrix.needsUpdate = true;
            }}
          >
            <planeGeometry args={[0.2, 0.23]} />
            <meshBasicMaterial toneMapped={false} />
          </instancedMesh>
          <mesh position={[0, 0.2, BD / 2 + 0.004]}>
            <planeGeometry args={[0.24, 0.4]} />
            <meshStandardMaterial color={controls.ink} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.5, BD / 2 + 0.03]}>
            <boxGeometry args={[0.5, 0.15, 0.04]} />
            <meshBasicMaterial map={sign} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </>
  );
}

const STEPS = 10;

export function Spiral() {
  const ref = useRef<THREE.Group>(null);
  const slabs = useRef<(THREE.Group | null)[]>([]);
  const speed = useSpeed(2);
  const a = useRef(0);
  useFrame((st, dt) => {
    dt = Math.min(dt, 0.05);
    const t = st.clock.elapsedTime;
    if (!scene.reduced) a.current -= dt * 0.6 * speed(dt);
    ref.current!.rotation.y = a.current;
    // vlna běží odspodu nahoru, schody jako by stoupaly
    slabs.current.forEach((s, i) => {
      if (!s) return;
      s.position.y = i * 0.2 + (scene.reduced ? 0 : Math.max(0, Math.sin(t * 2.2 - i * 0.55)) * 0.06);
    });
  });
  return (
    <>
      <Env intensity={0.7} />
      <group ref={ref} position-y={-0.95}>
        <mesh position-y={0.95}>
          <cylinderGeometry args={[0.07, 0.07, 2.1, 24]} />
          <meshPhysicalMaterial color="#c7d2cf" metalness={0.8} roughness={0.3} />
        </mesh>
        {Array.from({ length: STEPS }, (_, i) => {
          const top = i === STEPS - 1;
          const k = i / (STEPS - 1);
          const col = top ? controls.teal : new THREE.Color("#e9efed").lerp(new THREE.Color(controls.mint), k).getStyle();
          return (
            <group key={i} rotation-y={i * 0.62} ref={(el) => void (slabs.current[i] = el)}>
              <RoundedBox args={[0.82, 0.09, 0.34]} radius={0.03} smoothness={3} position-x={0.47}>
                <meshPhysicalMaterial color={col} roughness={0.3} clearcoat={0.8} clearcoatRoughness={0.2} />
              </RoundedBox>
            </group>
          );
        })}
      </group>
    </>
  );
}

const cam = (y: number, look: number): Cam => ({ fov: 30, pos: [0, y, 5.2], look: [0, look, 0] });

export const MOMENT_SCENES = [
  { C: Coin, cam: cam(0.5, 0) },
  { C: Building, cam: cam(0.9, 0) },
  { C: Spiral, cam: cam(1.3, 0.05) },
];
