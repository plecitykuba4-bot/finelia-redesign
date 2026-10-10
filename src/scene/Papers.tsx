import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Cam } from "./View";
import * as THREE from "three";
import { scene, slots } from "./state";
import { Blob, Env, docTexture, smooth, stampTexture, tickTexture, type DocKind } from "./shared";

/* Spolupráce ve čtyřech krocích, řízená scrollem (scene.steps 0..3):
   0 konzultace: doklady volně ve vzduchu
   1 předání: slétnou se do úhledného štosu
   2 zpracování a kontrola: štos se rozevře jako vzorník, každý list dostane fajfku
   3 podání: vzorník se zavře a na štos dopadne razítko „podáno“ */

const KINDS: DocKind[] = ["smlouva", "prehled", "vypis", "paska", "faktura", "dph"];
const N = KINDS.length;
const W = 1.0, H = 1.414, TH = 0.008;
const GAP = 0.014;

type Pose = { p: THREE.Vector3; q: THREE.Quaternion };

function rnd(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

const e = new THREE.Euler();
const pose = (x: number, y: number, z: number, rx: number, ry: number, rz: number): Pose => ({
  p: new THREE.Vector3(x, y, z),
  q: new THREE.Quaternion().setFromEuler(e.set(rx, ry, rz)),
});

function buildPoses(i: number, spread: number): Pose[] {
  const j = (k: number) => rnd(i * 13 + k) - 0.5;
  // 0: ve vzduchu
  const ang = (i / N) * Math.PI * 2 + 0.4;
  // ve vzduchu ve vrstvách nad sebou (vyšší index = výš) a jen mírně nakloněné, aby se listy neprotínaly
  const air = pose(Math.cos(ang) * 0.7 + j(1) * 0.12, 0.3 + i * 0.15, Math.sin(ang) * 0.32 + j(2) * 0.08, j(3) * 0.14, j(4) * 1.2, j(5) * 0.14);
  // 1: štos
  const stack = pose(j(6) * 0.05, i * GAP, j(7) * 0.04, 0, j(8) * 0.07, 0);
  // 2: vzorník kolem čepu v levém horním rohu
  const pin = new THREE.Vector3(-W / 2 + 0.1, 0, -H / 2 + 0.1);
  const a = -(N - 1 - i) * spread;
  const off = new THREE.Vector3(0, 0, 0).sub(pin).applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
  const fan = pose(pin.x + off.x + 0.12, i * GAP, pin.z + off.z + 0.05, 0, a, 0);
  // 3: zavřený štos, lehce natočený
  const done = pose(j(9) * 0.02, i * GAP, j(10) * 0.02, 0, 0.1 + j(11) * 0.03, 0);
  return [air, stack, fan, done];
}

export const papersCam: Cam = { fov: 30, pos: [0, 4.7, 3.7], look: [0, 0.1, 0.05] };

export default function Papers() {
  const gl = useThree((s) => s.gl);
  const mats = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ color: "#eef0ee", roughness: 0.9 });
    return KINDS.map((k) => [edge, edge, new THREE.MeshStandardMaterial({ map: docTexture(k, gl), roughness: 0.75 }), edge, edge, edge]);
  }, [gl]);
  const geo = useMemo(() => new THREE.BoxGeometry(W, TH, H), []);
  const sheets = useRef<(THREE.Group | null)[]>([]);
  const ticks = useRef<(THREE.Mesh | null)[]>([]);
  const seal = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const state = useMemo(() => KINDS.map(() => ({ p: new THREE.Vector3(0, 2, 0), q: new THREE.Quaternion() })), []);
  const cur = useRef({ spread: 0.2, rx: 0, ry: 0, p: 0 });
  const tmpP = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();

  useFrame((st, dt) => {
    dt = Math.min(dt, 0.05);
    // na úzkém displeji je panel nízký, papíry přiblížit
    const cam = st.camera as THREE.PerspectiveCamera;
    const zoom = innerWidth < 860 ? 1.3 : 1;
    if (cam.zoom !== zoom) {
      cam.zoom = zoom;
      cam.updateProjectionMatrix();
    }
    const t = st.clock.elapsedTime;
    const s = slots.papers;
    const c = cur.current;
    // scroll vyhlazený, aby přechody nebyly trhané ani při skoku kotvou
    c.p = scene.reduced ? scene.steps : THREE.MathUtils.damp(c.p, scene.steps, 6, dt);
    const P = Math.min(2.999, Math.max(0, c.p));
    const base = Math.floor(P);
    const f = P - base;

    // kurzor rozevírá vzorník víc nebo míň
    const want = 0.2 + (s.hover ? s.mx * 0.09 : 0);
    c.spread = THREE.MathUtils.damp(c.spread, want, 5, dt);
    c.rx = THREE.MathUtils.damp(c.rx, s.hover ? -s.my * 0.08 : 0, 3, dt);
    c.ry = THREE.MathUtils.damp(c.ry, s.hover ? s.mx * 0.12 : 0, 3, dt);
    if (rig.current) rig.current.rotation.set(c.rx, c.ry, 0);

    for (let i = 0; i < N; i++) {
      const g = sheets.current[i];
      if (!g) continue;
      const poses = buildPoses(i, c.spread);
      // listy se hýbou postupně: do štosu odspodu, ze štosu do vzorníku shora
      const order = base === 0 ? i : N - 1 - i;
      const k = smooth((f * 1.6 - (order / N) * 0.6) / 1.0);
      tmpP.lerpVectors(poses[base].p, poses[base + 1].p, k);
      tmpQ.slerpQuaternions(poses[base].q, poses[base + 1].q, k);
      // oblouk při přeletu, ať listy neprojíždějí skrz sebe
      // žádný oblouk: každý list drží svou výškovou vrstvu, takže nemůže projet jiným
      // vznášení ve vzduchu
      const air = (1 - Math.min(1, P)) * (scene.reduced ? 0 : 1);
      tmpP.y += Math.sin(t * 0.9 + i * 1.7) * 0.06 * air;

      const sp = state[i];
      if (scene.reduced) {
        sp.p.copy(tmpP);
        sp.q.copy(tmpQ);
      } else {
        // pružina s tlumením na pozici, rotace dotahovaná
        // tlumené dotažení bez překmitu (pružina s překmitem propichovala listy pod sebou)
        sp.p.lerp(tmpP, 1 - Math.exp(-10 * dt));
        sp.q.slerp(tmpQ, 1 - Math.exp(-10 * dt));
      }
      g.position.copy(sp.p);
      g.quaternion.copy(sp.q);

      // fajfky při kontrole, odspodu nahoru
      const tk = ticks.current[i];
      if (tk) {
        // fajfky jen u rozevřeného vzorníku; při zavírání zmizí a potvrzení převezme jediné razítko
        const show = base === 1 ? smooth((f - 0.55 - (i / N) * 0.35) / 0.1) : base === 2 ? 1 - smooth(f / 0.3) : 0;
        // drobný doskok jen při objevení, mizí se plynule bez nafouknutí
        const sc = base === 1 && show < 1 ? show * (1 + Math.sin(show * Math.PI) * 0.25) : show;
        tk.scale.setScalar(Math.max(0.001, sc));
        tk.visible = show > 0.001;
      }
    }

    // razítko dopadne na štos
    if (seal.current) {
      const k = base === 2 ? smooth((f - 0.55) / 0.35) : 0;
      const kk = P >= 2.999 ? 1 : k;
      const y = (N - 1) * GAP + TH / 2 + 0.002 + (1 - kk) * 1.2;
      seal.current.position.set(0.18, y, 0.3);
      seal.current.visible = kk > 0.01;
      const m = seal.current.children[0] as THREE.Mesh;
      (m.material as THREE.MeshBasicMaterial).opacity = kk;
      seal.current.scale.setScalar(0.6 + 0.4 * kk);
    }
  });

  return (
    <>
      <Env intensity={0.6} />
      <group ref={rig}>
        {KINDS.map((k, i) => (
          <group key={k} ref={(el) => void (sheets.current[i] = el)}>
            <mesh geometry={geo} material={mats[i]} />
            <mesh
              ref={(el) => void (ticks.current[i] = el)}
              rotation-x={-Math.PI / 2}
              position={[W / 2 - 0.16, TH / 2 + 0.001, -H / 2 + 0.16]}
              visible={false}
            >
              <planeGeometry args={[0.17, 0.17]} />
              <meshBasicMaterial map={tickTexture()} transparent toneMapped={false} />
            </mesh>
          </group>
        ))}
        <group ref={seal} visible={false}>
          <mesh rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.62, 0.62]} />
            <meshBasicMaterial map={stampTexture()} transparent opacity={0} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      </group>
      <Blob w={2.2} d={2.4} y={-0.02} opacity={0.28} />
    </>
  );
}
