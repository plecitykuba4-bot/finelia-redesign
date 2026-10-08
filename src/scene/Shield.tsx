import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, type Cam } from "./View";
import * as THREE from "three";
import { controls, scene, slots } from "./state";
import { Blob, Env, damp, smooth } from "./shared";

/* Štít z loga Finelia: obrys, tři sloupce grafu a fajfka.
   Při načtení se sloupce vytáhnou a fajfka se „dopíše“, kurzor štít natáčí,
   najetí sloupce povytáhne (růst). */

function outline() {
  const s = new THREE.Shape();
  s.moveTo(0, 1.13);
  s.quadraticCurveTo(0.48, 1.13, 0.86, 1.0);
  s.quadraticCurveTo(1.0, 0.96, 1.0, 0.8);
  s.lineTo(1.0, 0.05);
  s.bezierCurveTo(1.0, -0.68, 0.52, -1.06, 0, -1.34);
  s.bezierCurveTo(-0.52, -1.06, -1.0, -0.68, -1.0, 0.05);
  s.lineTo(-1.0, 0.8);
  s.quadraticCurveTo(-1.0, 0.96, -0.86, 1.0);
  s.quadraticCurveTo(-0.48, 1.13, 0, 1.13);
  return s.getSpacedPoints(160).slice(0, -1);
}

/* Odsazení uzavřeného polygonu po normálách (dovnitř pro kladné d). */
function inset(pts: THREE.Vector2[], d: number) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }
  const sign = area > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length];
    const t = new THREE.Vector2().subVectors(b, a).normalize();
    const n = new THREE.Vector2(-t.y, t.x).multiplyScalar(sign); // levá strana u CCW = dovnitř
    return p.clone().addScaledVector(n, d);
  });
}

function useShieldGeometry() {
  return useMemo(() => {
    const outer = outline();
    const inner = inset(outer, 0.17);
    const ring = new THREE.Shape(outer);
    ring.holes.push(new THREE.Path(inner));
    const ringGeo = new THREE.ExtrudeGeometry(ring, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.035, bevelSegments: 5, curveSegments: 4 });
    ringGeo.translate(0, 0, -0.1);
    const plate = new THREE.ShapeGeometry(new THREE.Shape(inset(outer, 0.12)));
    return { ringGeo, plate };
  }, []);
}

const BARS = [
  { x: -0.4, h: 0.48 },
  { x: -0.06, h: 0.7 },
  { x: 0.28, h: 0.92 }, // vrchol nejvyššího sloupce končí v polovině štítu, ne u horní hrany
];
const BASE = -0.36;

// fajfka A → B → C
const A = new THREE.Vector2(-0.62, 0.0);
const B = new THREE.Vector2(-0.2, -0.44);
const C = new THREE.Vector2(0.86, 0.62);
const T = 0.2;

function Arm({ from, to, armRef }: { from: THREE.Vector2; to: THREE.Vector2; armRef: React.RefObject<THREE.Group | null> }) {
  const len = from.distanceTo(to) + T * 0.5;
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  return (
    <group position={[from.x, from.y, 0.26]} rotation-z={ang}>
      <group ref={armRef}>
        <RoundedBox args={[len, T, 0.2]} radius={0.07} smoothness={4} position-x={len / 2 - T * 0.25}>
          <meshPhysicalMaterial color={controls.tealDeep} roughness={0.28} clearcoat={1} clearcoatRoughness={0.15} />
        </RoundedBox>
      </group>
    </group>
  );
}

export const shieldCam: Cam = { fov: 26, pos: [0, 0.45, 7.4], look: [0, -0.12, 0] };

export default function Shield() {
  const { ringGeo, plate } = useShieldGeometry();
  const root = useRef<THREE.Group>(null);
  const bars = useRef<(THREE.Group | null)[]>([]);
  const arm1 = useRef<THREE.Group>(null);
  const arm2 = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  const cur = useRef({ rx: 0, ry: 0, grow: 0 });

  useFrame((st, dt) => {
    // úvodní animace začne, až když je panel opravdu vidět (ne už během načítání stránky)
    if (t0.current === null && slots.hero.alpha > 0.02) t0.current = st.clock.elapsedTime;
    const t = scene.reduced ? 99 : t0.current === null ? 0 : st.clock.elapsedTime - t0.current;
    const s = slots.hero;
    const c = cur.current;
    dt = Math.min(dt, 0.05);

    // natočení za kurzorem + odjezd při scrollu
    const tx = scene.reduced ? 0 : -s.my * controls.tilt * 0.6;
    // stálé pomalé kývání doleva a doprava, kurzor se k němu přičítá
    const sway = Math.sin(t * 0.55) * controls.sway;
    const ty = scene.reduced ? -0.18 : sway + s.mx * controls.tilt * 0.7 - 0.12 + scene.heroOut * 0.9;
    c.rx = damp(c.rx, tx, 4, dt);
    c.ry = damp(c.ry, ty, 4, dt);
    c.grow = damp(c.grow, s.hover && !scene.reduced ? 1 : 0, 5, dt);

    const g = root.current!;
    const intro = smooth(t / 1.1);
    g.rotation.set(c.rx + Math.sin(t * 0.6) * 0.03, c.ry + (1 - intro) * -0.9, Math.sin(t * 0.45) * 0.02);
    // štít zůstává na místě v panelu, při odjezdu hero se jen pootočí
    g.position.y = Math.sin(t * 0.9) * 0.04;
    g.scale.setScalar(0.85 + 0.15 * smooth(t / 0.9));

    bars.current.forEach((b, i) => {
      if (!b) return;
      const k = smooth((t - 0.35 - i * 0.16) / 0.7);
      // graf pomalu jezdí nahoru a dolů, každý sloupec ve vlastní fázi; výška nikdy nepřekročí 100 %
      const wave = scene.reduced ? 1 : 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(t * 0.7 + i * 2.1 + 1.6));
      const live = THREE.MathUtils.lerp(wave, 1, c.grow); // při najetí se graf srovná na maximum
      b.scale.y = Math.max(0.001, k * live);
    });

    // fajfka se dopíše: krátké rameno, pak dlouhé
    if (arm1.current) arm1.current.scale.x = Math.max(0.001, smooth((t - 0.95) / 0.22));
    if (arm2.current) arm2.current.scale.x = Math.max(0.001, smooth((t - 1.15) / 0.38));
    if (arm2.current) arm2.current.position.z = c.grow * 0.08;
  });

  return (
    <>
      <Env intensity={0.85} />
      <group ref={root}>
        <mesh geometry={ringGeo}>
          <meshPhysicalMaterial color={controls.teal} roughness={0.32} metalness={0.05} clearcoat={1} clearcoatRoughness={0.2} />
        </mesh>
        <mesh geometry={plate} position-z={-0.06}>
          <meshStandardMaterial color="#eaf5f1" roughness={0.8} />
        </mesh>
        {BARS.map((b, i) => (
          <group key={i} position={[b.x, BASE, 0.02]} ref={(el) => void (bars.current[i] = el)}>
            <RoundedBox args={[0.22, b.h, 0.16]} radius={0.04} smoothness={3} position-y={b.h / 2}>
              <meshPhysicalMaterial color={i === 2 ? controls.teal : i === 1 ? "#3fb39c" : controls.mint} roughness={0.35} clearcoat={0.6} />
            </RoundedBox>
          </group>
        ))}
        <Arm from={A} to={B} armRef={arm1} />
        <Arm from={B} to={C} armRef={arm2} />
      </group>
      <Blob w={2.6} d={0.7} y={-1.75} opacity={0.6} />
    </>
  );
}
