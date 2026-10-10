import { useCallback, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { slots } from "./state";
import { View } from "./View";
import Desk, { deskCam } from "./Desk";
import Papers, { papersCam } from "./Papers";
import { ICONS } from "./Icons";
import { MOMENT_SCENES } from "./Moments3D";
import MobileScene from "./MobileScene";

export { envReady } from "./shared";

/* Jeden WebGL kontext pro celou stránku. Každá 3D ukázka je View, které kreslí
   do obdélníku svého DOM prvku. Snímek pohání ticker GSAPu hned po Lenisu,
   takže 3D nezaostává za scrollem ani o snímek. */

function Driver() {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    // R3F v režimu "never" bere čas v sekundách (rovnou ho zapíše do clock.elapsedTime)
    const tick = (time: number) => advance(time);
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [advance]);
  // views kreslí bez mazání, plátno se maže jednou na začátku snímku
  useFrame(({ gl }) => {
    gl.setScissorTest(false);
    gl.clear(true, true);
  }, 0);
  return null;
}

/* Na dotykových zařízeních vlastní plátno v každém rámečku (viz MobileScene), jinak jedno sdílené. */
const touch = typeof matchMedia !== "undefined" && matchMedia("(hover: none)").matches;

const idle = (fn: () => void) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 600 }) : setTimeout(fn, 120));

/* Scény mimo hero: připojují se po jedné, až když je předchozí hotová a prohlížeč má volno. */
const REST = [
  ...MOMENT_SCENES.map(({ C, cam }, i) => ({ slot: slots.moments[i], cam, C })),
  ...ICONS.map(({ C, cam }, i) => ({ slot: slots.icons[i], cam, C })),
  { slot: slots.papers, cam: papersCam, C: Papers },
];

export default function Scene() {
  const [n, setN] = useState(0);
  const next = useCallback(() => void idle(() => setN((x) => Math.min(x + 1, REST.length))), []);
  const heroReady = useCallback(() => {
    performance.mark("3d-ready");
    dispatchEvent(new Event("hero-3d")); // stránka odhalí stůl
    next();
  }, [next]);
  if (touch) {
    return <MobileScene stages={[{ slot: slots.hero, cam: deskCam, C: Desk }, ...REST]} />;
  }
  return (
    <Canvas
      className="gl"
      frameloop="never"
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.autoClear = false;
        // synchronní kontrola shaderů na Windows (ANGLE/D3D) blokuje stovky ms na program
        gl.debug.checkShaderErrors = false;
      }}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 5 }}
    >
      <Driver />
      <View slot={slots.hero} cam={deskCam} onReady={heroReady} fade={false}>
        <Desk />
      </View>
      {REST.slice(0, n).map(({ slot, cam, C }, i) => (
        <View key={i} slot={slot} cam={cam} onReady={next}>
          <C />
        </View>
      ))}
    </Canvas>
  );
}
