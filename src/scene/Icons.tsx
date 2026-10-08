import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, type Cam } from "./View";
import * as THREE from "three";
import { controls, scene, slots } from "./state";
import { Blob, Env, docTexture, smooth, stampTexture } from "./shared";

/* Malé 3D ikony u služeb. Každá má klidovou smyčku a akci při najetí na kartu. */

const damp = THREE.MathUtils.damp;
const glossy = (color: string, rough = 0.35) => <meshPhysicalMaterial color={color} roughness={rough} clearcoat={0.7} clearcoatRoughness={0.25} />;

function useHover(i: number) {
  const h = useRef(0);
  return (dt: number) => {
    h.current = damp(h.current, slots.icons[i].hover ? 1 : 0, 6, dt);
    return h.current;
  };
}

/* 1 · Daňové přiznání: razítko dopadá na formulář a nechá otisk. */
export function StampIcon() {
  const gl = useThree((s) => s.gl);
  const stamp = useRef<THREE.Group>(null);
  const mark = useRef<THREE.Mesh>(null);
  const rig = useRef<THREE.Group>(null);
  const hover = useHover(0);
  const ph = useRef(0.3);
  const docMat = useMemo(() => new THREE.MeshStandardMaterial({ map: docTexture("priznani", gl), roughness: 0.8 }), [gl]);
  const edge = useMemo(() => new THREE.MeshStandardMaterial({ color: "#eef0ee" }), []);

  useFrame((st, dt) => {
    dt = Math.min(dt, 0.05);
    const h = hover(dt);
    const t = st.clock.elapsedTime;
    // fáze cyklu, při najetí rychleji
    if (!scene.reduced) ph.current = (ph.current + dt / (2.8 - h * 1.4)) % 1;
    const p = scene.reduced ? 0.6 : ph.current;
    const down = p < 0.1 ? smooth(p / 0.1) ** 2 : p < 0.18 ? 1 : 1 - smooth((p - 0.18) / 0.35);
    stamp.current!.position.y = 0.06 + (1 - down) * 0.75;
    stamp.current!.rotation.z = (1 - down) * 0.12;
    const m = mark.current!;
    const vis = p < 0.08 ? 1 - p / 0.08 : p >= 0.1 ? 1 : 0;
    (m.material as THREE.MeshBasicMaterial).opacity = vis * 0.95;
    m.scale.setScalar(p >= 0.1 && p < 0.16 ? 0.9 + ((p - 0.1) / 0.06) * 0.1 : 1);
    rig.current!.rotation.y = -0.35 + (scene.reduced ? 0 : Math.sin(t * 0.5) * 0.12) + h * 0.15;
  });

  return (
    <>
      <Env />
      <group ref={rig}>
        <mesh material={[edge, edge, docMat, edge, edge, edge]} rotation-y={0.08}>
          <boxGeometry args={[1.1, 0.012, 1.55]} />
        </mesh>
        <mesh ref={mark} rotation-x={-Math.PI / 2} position={[0.12, 0.008, 0.28]}>
          <planeGeometry args={[0.6, 0.6]} />
          <meshBasicMaterial map={stampTexture()} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
        <group ref={stamp} position={[0.12, 0.8, 0.28]}>
          <mesh position-y={0.04}>
            <cylinderGeometry args={[0.31, 0.31, 0.07, 40]} />
            {glossy(controls.tealDeep)}
          </mesh>
          <mesh position-y={0.13}>
            <cylinderGeometry args={[0.27, 0.3, 0.12, 40]} />
            {glossy(controls.teal)}
          </mesh>
          <mesh position-y={0.36}>
            <cylinderGeometry args={[0.07, 0.09, 0.36, 24]} />
            {glossy(controls.ink, 0.3)}
          </mesh>
          <mesh position-y={0.6}>
            <sphereGeometry args={[0.15, 32, 16]} />
            {glossy(controls.ink, 0.25)}
          </mesh>
        </group>
      </group>
      <Blob w={2} d={2} y={-0.01} opacity={0.35} />
    </>
  );
}

/* 2 · Účetnictví: tři šanony, prostřední se při najetí vysune. */
function Binder({ x, color, out }: { x: number; color: string; out?: React.RefObject<THREE.Group | null> }) {
  return (
    <group position-x={x} ref={out}>
      <RoundedBox args={[0.34, 1.3, 1.05]} radius={0.035} smoothness={3} position-y={0.65}>
        {glossy(color, 0.45)}
      </RoundedBox>
      <mesh position={[0, 0.88, 0.527]}>
        <planeGeometry args={[0.22, 0.5]} />
        <meshStandardMaterial color="#fbfbf9" roughness={0.9} />
      </mesh>
      {[0, 1, 2].map((k) => (
        <mesh key={k} position={[0, 0.98 - k * 0.1, 0.529]}>
          <planeGeometry args={[0.14 - k * 0.025, 0.025]} />
          <meshBasicMaterial color="#9aa8a4" />
        </mesh>
      ))}
      <mesh position={[0, 0.32, 0.53]}>
        <circleGeometry args={[0.075, 32]} />
        <meshStandardMaterial color="#0a1c1a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.32, 0.53]}>
        <torusGeometry args={[0.08, 0.012, 8, 32]} />
        <meshStandardMaterial color="#c7d0cd" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function BinderIcon() {
  const rig = useRef<THREE.Group>(null);
  const mid = useRef<THREE.Group>(null);
  const hover = useHover(1);
  useFrame((st, dt) => {
    dt = Math.min(dt, 0.05);
    const h = hover(dt);
    const t = st.clock.elapsedTime;
    rig.current!.rotation.y = -0.5 + (scene.reduced ? 0 : Math.sin(t * 0.55) * 0.14) + h * 0.2;
    const idle = scene.reduced ? 0 : (Math.sin(t * 1.1) * 0.5 + 0.5) * 0.06;
    mid.current!.position.z = idle + h * 0.42;
    mid.current!.rotation.x = -h * 0.08;
  });
  return (
    <>
      <Env />
      <group ref={rig}>
        <Binder x={-0.37} color={controls.ink} />
        <Binder x={0} color={controls.teal} out={mid} />
        <Binder x={0.37} color={controls.mint} />
      </group>
      <Blob w={2.2} d={1.8} y={0} opacity={0.4} />
    </>
  );
}

/* 3 · Mzdy: z obálky vyjíždí výplatní páska. */
function flapGeo() {
  const s = new THREE.Shape();
  s.moveTo(-0.65, 0);
  s.lineTo(0.65, 0);
  s.lineTo(0, -0.5);
  s.closePath();
  return new THREE.ShapeGeometry(s);
}

export function EnvelopeIcon() {
  const gl = useThree((s) => s.gl);
  const rig = useRef<THREE.Group>(null);
  const slip = useRef<THREE.Group>(null);
  const flap = useRef<THREE.Group>(null);
  const hover = useHover(2);
  const geo = useMemo(flapGeo, []);
  const slipMat = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ color: "#eef0ee" });
    return [edge, edge, edge, edge, new THREE.MeshStandardMaterial({ map: docTexture("paska", gl), roughness: 0.8 }), edge];
  }, [gl]);
  useFrame((st, dt) => {
    dt = Math.min(dt, 0.05);
    const h = hover(dt);
    const t = st.clock.elapsedTime;
    rig.current!.rotation.y = -0.3 + (scene.reduced ? 0 : Math.sin(t * 0.5) * 0.15);
    rig.current!.rotation.x = -0.12;
    const peek = scene.reduced ? 0.3 : 0.24 + Math.sin(t * 1.2) * 0.05;
    slip.current!.position.y = damp(slip.current!.position.y, peek + h * 0.5, 5, dt);
    flap.current!.rotation.x = Math.PI * (0.88 + h * 0.07);
  });
  return (
    <>
      <Env />
      <group ref={rig}>
        {/* zadní stěna */}
        <mesh position={[0, 0, -0.035]}>
          <boxGeometry args={[1.3, 0.85, 0.02]} />
          <meshStandardMaterial color="#7fcab9" roughness={0.7} />
        </mesh>
        <group ref={slip} position={[0, 0.25, 0]}>
          <mesh material={slipMat} position-y={0}>
            <boxGeometry args={[1.12, 1.4 * 0.79, 0.008]} />
          </mesh>
        </group>
        {/* přední kapsa */}
        <mesh position={[0, -0.1, 0.035]}>
          <boxGeometry args={[1.3, 0.65, 0.02]} />
          <meshStandardMaterial color="#a8dccf" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.1, 0.0455]}>
          <planeGeometry args={[1.3, 0.04]} />
          <meshBasicMaterial color={controls.tealDeep} />
        </mesh>
        <group ref={flap} position={[0, 0.425, -0.03]}>
          <mesh geometry={geo}>
            <meshStandardMaterial color="#6cc0ad" roughness={0.7} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
      <Blob w={2} d={0.8} y={-0.6} opacity={0.4} />
    </>
  );
}

/* 4 · Poradenství: prstencový graf, největší díl se při najetí vysune. */
const SEG = [
  { f: 0.38, h: 0.42, color: controls.teal },
  { f: 0.26, h: 0.3, color: controls.ink },
  { f: 0.2, h: 0.24, color: controls.mint },
  { f: 0.16, h: 0.18, color: "#3fb39c" },
];

function arcGeo(a0: number, a1: number, h: number) {
  const s = new THREE.Shape();
  const R = 1, r = 0.52, gap = 0.035;
  s.absarc(0, 0, R, a0 + gap / R, a1 - gap / R, false);
  s.absarc(0, 0, r, a1 - gap / r, a0 + gap / r, true);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 40 });
  g.rotateX(-Math.PI / 2);
  return g;
}

export function DonutIcon() {
  const rig = useRef<THREE.Group>(null);
  const segs = useRef<(THREE.Mesh | null)[]>([]);
  const hover = useHover(3);
  const parts = useMemo(() => {
    let a = 0;
    return SEG.map((s) => {
      const a0 = a, a1 = a + s.f * Math.PI * 2;
      a = a1;
      return { ...s, geo: arcGeo(a0, a1, s.h), mid: (a0 + a1) / 2 };
    });
  }, []);
  useFrame((st, dt) => {
    dt = Math.min(dt, 0.05);
    const h = hover(dt);
    const t = st.clock.elapsedTime;
    if (!scene.reduced) rig.current!.rotation.y += dt * (0.25 + h * 0.3);
    parts.forEach((p, i) => {
      const m = segs.current[i];
      if (!m) return;
      const lift = i === 0 ? h : 0;
      const breathe = scene.reduced ? 1 : 1 + Math.sin(t * 1.4 + i * 1.3) * 0.08;
      m.position.set(Math.cos(p.mid) * lift * 0.2, lift * 0.18, -Math.sin(p.mid) * lift * 0.2);
      m.scale.y = breathe + lift * 0.4;
    });
  });
  return (
    <>
      <Env />
      <group ref={rig} rotation-y={0.6}>
        {parts.map((p, i) => (
          <mesh key={i} geometry={p.geo} ref={(el) => void (segs.current[i] = el)}>
            {glossy(p.color, 0.4)}
          </mesh>
        ))}
      </group>
      <Blob w={2.8} d={2.8} y={-0.01} opacity={0.35} />
    </>
  );
}

const cam = (pos: Cam["pos"], look: Cam["look"]): Cam => ({ fov: 28, pos, look });

export const ICONS: { C: () => React.JSX.Element; cam: Cam }[] = [
  { C: StampIcon, cam: cam([0, 3.1, 2.7], [0, 0.25, 0]) },
  { C: BinderIcon, cam: cam([0, 1.6, 3.9], [0, 0.6, 0]) },
  { C: EnvelopeIcon, cam: cam([0, 0.5, 4.2], [0, 0.25, 0]) },
  { C: DonutIcon, cam: cam([0, 2.7, 3.2], [0, 0.1, 0]) },
];
