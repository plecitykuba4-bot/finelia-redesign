import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { controls, scene, slots } from "./state";
import { Env, docTexture, smooth, stampTexture, type DocKind } from "./shared";
import { RoundedBox, type Cam } from "./View";
import { Binder } from "./Icons";

/* Hero: pracovní stůl účetní. Věci leží přímo na pozadí stránky (průhledné plátno, stín na ShadowMaterial).
   Běží samo: doklad přeletí z hromádky „ke zpracování“ na hromádku „hotovo“, razítko ho orazítkuje,
   kalkulačka mezitím přičítá. Kurzor scénu jemně naklání a práci zrychlí. */

const KINDS: DocKind[] = ["faktura", "vypis", "paska", "dph", "prehled", "priznani", "smlouva"];
const W = 1.25, H = 1.77, TH = 0.008, GAP = 0.012;
const PILE = 4;

const MESSY = new THREE.Vector3(-0.92, 0, 0.3);
const NEAT = new THREE.Vector3(0.66, 0, 0.3);
const REST = new THREE.Vector3(1.78, 0, -0.5); // kde razítko stojí
const MARK = new THREE.Vector3(0.2, 0, 0.32); // otisk na listu (v jeho souřadnicích)
const CYCLE = 6.4;

const rnd = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

/* Displej kalkulačky. */
function useDisplay() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 80;
    const g = c.getContext("2d")!;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const draw = (v: number) => {
      g.fillStyle = "#0a1d1b";
      g.fillRect(0, 0, 256, 80);
      g.fillStyle = "#7fe6cf";
      g.font = '600 44px "Geist Mono Variable", ui-monospace, monospace';
      g.textAlign = "right";
      g.textBaseline = "middle";
      g.fillText(Math.round(v).toLocaleString("cs-CZ"), 240, 43);
      tex.needsUpdate = true;
    };
    draw(0);
    return { tex, draw };
  }, []);
}

function Calculator({ display }: { display: THREE.Texture }) {
  const keys = useMemo(() => {
    const out: { x: number; z: number; color: string }[] = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) out.push({ x: (c - 1.5) * 0.215, z: -0.1 + r * 0.215, color: c === 3 ? (r === 3 ? controls.tealDeep : controls.teal) : "#e9efed" });
    return out;
  }, []);
  return (
    <group>
      <RoundedBox args={[1.02, 0.1, 1.46]} radius={0.045} smoothness={3} position-y={0.05}>
        <meshStandardMaterial color="#0f2a27" roughness={0.75} />
      </RoundedBox>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.102, -0.47]}>
        <planeGeometry args={[0.84, 0.3]} />
        <meshBasicMaterial map={display} toneMapped={false} />
      </mesh>
      {keys.map((k, i) => (
        <RoundedBox key={i} args={[0.17, 0.05, 0.17]} radius={0.02} smoothness={2} position={[k.x, 0.12, k.z]}>
          <meshStandardMaterial color={k.color} roughness={0.5} />
        </RoundedBox>
      ))}
    </group>
  );
}

function Cup() {
  const geo = useMemo(() => {
    const p = [
      [0, 0.02], [0.24, 0.02], [0.29, 0.06], [0.33, 0.5], [0.35, 0.52], [0.31, 0.52], [0.27, 0.1], [0, 0.1],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(p, 48);
  }, []);
  const ceramic = <meshStandardMaterial color="#f7f8f6" roughness={0.25} />;
  return (
    <group>
      <mesh position-y={0.015}>
        <cylinderGeometry args={[0.52, 0.46, 0.03, 48]} />
        {ceramic}
      </mesh>
      <mesh geometry={geo} position-y={0.03}>
        {ceramic}
      </mesh>
      <mesh position-y={0.47} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.305, 40]} />
        <meshStandardMaterial color="#3a2317" roughness={0.3} />
      </mesh>
      <mesh position={[0.36, 0.31, 0]} rotation-z={-Math.PI / 2}>
        <torusGeometry args={[0.13, 0.032, 12, 28, Math.PI]} />
        {ceramic}
      </mesh>
    </group>
  );
}

function Pen() {
  return (
    <group rotation-z={Math.PI / 2}>
      <mesh>
        <cylinderGeometry args={[0.04, 0.04, 1.35, 20]} />
        <meshStandardMaterial color={controls.ink} roughness={0.3} />
      </mesh>
      <mesh position-y={0.74}>
        <coneGeometry args={[0.04, 0.14, 20]} />
        <meshStandardMaterial color="#c7d2cf" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position-y={-0.6}>
        <cylinderGeometry args={[0.043, 0.043, 0.16, 20]} />
        <meshStandardMaterial color={controls.teal} roughness={0.3} />
      </mesh>
    </group>
  );
}

function StampTool() {
  const m = (color: string) => <meshStandardMaterial color={color} roughness={0.35} />;
  return (
    <>
      <mesh position-y={0.04}>
        <cylinderGeometry args={[0.3, 0.3, 0.07, 40]} />
        {m(controls.tealDeep)}
      </mesh>
      <mesh position-y={0.13}>
        <cylinderGeometry args={[0.26, 0.29, 0.12, 40]} />
        {m(controls.teal)}
      </mesh>
      <mesh position-y={0.36}>
        <cylinderGeometry args={[0.07, 0.09, 0.36, 24]} />
        {m(controls.ink)}
      </mesh>
      <mesh position-y={0.6}>
        <sphereGeometry args={[0.15, 32, 16]} />
        {m(controls.ink)}
      </mesh>
    </>
  );
}

export const deskCam: Cam = { fov: 27, pos: [0, 8.4, 5.7], look: [0, 0, -0.1] };

export default function Desk() {
  const gl = useThree((s) => s.gl);
  const display = useDisplay();
  const rig = useRef<THREE.Group>(null);
  const things = useRef<THREE.Group>(null);
  const mover = useRef<THREE.Mesh>(null);
  const stamp = useRef<THREE.Group>(null);
  const mark = useRef<THREE.Mesh>(null);

  const geo = useMemo(() => new THREE.BoxGeometry(W, TH, H), []);
  const mats = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, emissive: "#ffffff", emissiveIntensity: 0.18 });
    // lehce samosvítivý papír, ať je opravdu bílý a ne šedý
    const top = () => {
      const map = docTexture(KINDS[0], gl);
      return new THREE.MeshStandardMaterial({ map, roughness: 0.78, emissive: "#ffffff", emissiveMap: map, emissiveIntensity: 0.22 });
    };
    const face = (m: THREE.Material) => [edge, edge, m, edge, edge, edge];
    const mv = top(), messy = top(), neat = top();
    return { edge, mv, messy, neat, moverMat: face(mv), messyMat: face(messy), neatMat: face(neat), plain: face(edge) };
  }, [gl]);

  const st = useRef({ seen: false, t: 0, i: -1, speed: 1, rx: 0, ry: 0, shown: 0, lastDraw: 0, total: 128400 });
  const from = useMemo(() => new THREE.Vector3(), []);
  const to = useMemo(() => new THREE.Vector3(), []);

  // všechno kromě stínové plochy a otisku vrhá i přijímá stín
  useLayoutEffect(() => {
    things.current?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !m.userData.flat) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
  }, []);

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.05);
    const s = st.current;
    const slot = slots.hero;
    if (!s.seen && slot.alpha > 0.5) {
      s.seen = true;
      performance.mark("3d-hero"); // měření: kdy je stůl poprvé opravdu vidět
    }
    s.speed = THREE.MathUtils.damp(s.speed, slot.hover ? 1.9 : 1, 3, dt);
    if (!scene.reduced) s.t += dt * s.speed;

    // nový cyklus: doklad, který právě dosedl, se stane vrchem hotové hromádky a další vyráží
    const i = scene.reduced ? 0 : Math.floor(s.t / CYCLE);
    if (i !== s.i) {
      s.i = i;
      const k = (n: number) => docTexture(KINDS[((n % KINDS.length) + KINDS.length) % KINDS.length], gl);
      for (const [m, n] of [[mats.neat, i - 1], [mats.mv, i], [mats.messy, i + 1]] as const) m.map = m.emissiveMap = k(n);
      s.total += 2200 + ((i * 3170) % 9000);
    }
    const u = scene.reduced ? CYCLE : s.t - i * CYCLE;

    // přelet dokladu obloukem
    const fly = smooth(u / 1.5);
    from.set(MESSY.x, PILE * GAP, MESSY.z);
    to.set(NEAT.x, PILE * GAP, NEAT.z);
    const m = mover.current!;
    m.position.lerpVectors(from, to, fly);
    m.position.y += Math.sin(fly * Math.PI) * 0.55;
    m.rotation.set(Math.sin(fly * Math.PI) * -0.25, THREE.MathUtils.lerp(0.16, 0.03, fly), Math.sin(fly * Math.PI) * 0.12);

    // razítko: přejezd, úder, návrat
    const go = smooth((u - 1.7) / 0.6);
    const back = smooth((u - 2.85) / 0.7);
    const over = go - back;
    const hit = smooth((u - 2.3) / 0.14) - smooth((u - 2.5) / 0.3);
    const g = stamp.current!;
    const tx = NEAT.x + MARK.x, tz = NEAT.z + MARK.z;
    // v klidu stojí na stole, nad hromádkou visí ve výšce 0.7 a při úderu dosedne na vrchní list
    const top = (PILE + 1) * GAP;
    const y = over * (0.7 - hit * (0.7 - top)) + Math.sin(over * Math.PI) * 0.2;
    g.position.set(THREE.MathUtils.lerp(REST.x, tx, over), y, THREE.MathUtils.lerp(REST.z, tz, over));
    g.rotation.z = (1 - hit) * over * 0.1;

    // otisk: objeví se při úderu, zmizí pod dalším dokladem
    const mk = mark.current!;
    const on = scene.reduced ? 1 : u < 1.3 ? 1 - smooth((u - 0.85) / 0.3) : smooth((u - 2.42) / 0.06);
    (mk.material as THREE.MeshBasicMaterial).opacity = on * 0.92;
    mk.visible = on > 0.01;

    // kalkulačka přičítá, displej se překresluje jen párkrát za sekundu a jen když je scéna vidět
    s.shown += (s.total - s.shown) * Math.min(1, dt * 2.2);
    if (slot.alpha > 0.05 && state.clock.elapsedTime - s.lastDraw > 0.12) {
      s.lastDraw = state.clock.elapsedTime;
      display.draw(s.shown);
    }

    // kurzor scénu jemně naklání
    s.rx = THREE.MathUtils.damp(s.rx, scene.reduced ? 0 : -slot.my * 0.035, 3, dt);
    s.ry = THREE.MathUtils.damp(s.ry, scene.reduced ? 0 : slot.mx * 0.06, 3, dt);
    rig.current!.rotation.set(s.rx, s.ry, 0);
  });

  const sheet = (key: string, pos: [number, number, number], ry: number, material: THREE.Material[]) => (
    <mesh key={key} geometry={geo} material={material} position={pos} rotation-y={ry} />
  );

  return (
    <>
      <Env intensity={0.6} shadow />
      <group ref={rig}>
        {/* průhledná plocha, na kterou dopadá stín: věci „leží“ na pozadí stránky */}
        <mesh rotation-x={-Math.PI / 2} position-y={-0.001} receiveShadow userData={{ flat: true }}>
          <planeGeometry args={[18, 18]} />
          <shadowMaterial opacity={0.2} color="#0e2624" />
        </mesh>
        <group ref={things}>
          {/* ke zpracování: rozházená hromádka */}
          {Array.from({ length: PILE }, (_, i) =>
            sheet(`m${i}`, [MESSY.x + (rnd(i) - 0.5) * 0.16, i * GAP + TH / 2, MESSY.z + (rnd(i + 9) - 0.5) * 0.14], 0.16 + (rnd(i + 3) - 0.5) * 0.3, i === PILE - 1 ? mats.messyMat : mats.plain)
          )}
          {/* hotovo: srovnaná hromádka */}
          {Array.from({ length: PILE }, (_, i) =>
            sheet(`n${i}`, [NEAT.x + (rnd(i + 20) - 0.5) * 0.02, i * GAP + TH / 2, NEAT.z + (rnd(i + 30) - 0.5) * 0.02], 0.03, i === PILE - 1 ? mats.neatMat : mats.plain)
          )}
          <mesh ref={mover} geometry={geo} material={mats.moverMat} />
          <group ref={stamp}>
            <StampTool />
          </group>
          <group position={[1.36, 0, 1.55]} rotation-y={-0.28} scale={0.82}>
            <Calculator display={display.tex} />
          </group>
          <group position={[1.3, 0, -1.6]} rotation-y={-0.5} scale={0.88}>
            <Binder x={-0.19} color={controls.ink} />
            <Binder x={0.19} color={controls.teal} />
          </group>
          <group position={[-0.75, 0, -1.55]} rotation-y={0.5}>
            <Cup />
          </group>
          <group position={[-0.25, 0.045, 1.85]} rotation-y={0.3}>
            <Pen />
          </group>
        </group>
        <mesh ref={mark} rotation-x={-Math.PI / 2} rotation-z={-0.12} position={[NEAT.x + MARK.x, (PILE + 1) * GAP + 0.002, NEAT.z + MARK.z]} userData={{ flat: true }} visible={false}>
          <planeGeometry args={[0.62, 0.62]} />
          <meshBasicMaterial map={stampTexture()} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </>
  );
}
