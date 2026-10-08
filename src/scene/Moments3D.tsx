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

export function Rings() {
  const ref = useRef<THREE.Group>(null);
  const speed = useSpeed(1);
  const a = useRef(0);
  useFrame((st, dt) => {
    dt = Math.min(dt, 0.05);
    const t = st.clock.elapsedTime;
    if (!scene.reduced) a.current += dt * 0.55 * speed(dt);
    const g = ref.current!;
    g.rotation.set(scene.reduced ? 0.4 : 0.35 + Math.sin(t * 0.5) * 0.25, a.current, Math.sin(t * 0.35) * 0.12);
  });
  const mat = (color: string) => <meshPhysicalMaterial color={color} roughness={0.22} metalness={0.1} clearcoat={1} clearcoatRoughness={0.12} />;
  return (
    <>
      <Env intensity={0.7} />
      <group ref={ref}>
        <mesh position-x={-0.36}>
          <torusGeometry args={[0.66, 0.13, 32, 96]} />
          {mat("#e9efed")}
        </mesh>
        <mesh position-x={0.36} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.66, 0.13, 32, 96]} />
          {mat(controls.teal)}
        </mesh>
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
  { C: Rings, cam: cam(0.6, 0) },
  { C: Spiral, cam: cam(1.3, 0.05) },
];
