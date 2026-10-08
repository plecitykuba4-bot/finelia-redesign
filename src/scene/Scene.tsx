import { useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { markSceneReady, slots } from "./state";
import { View, precompileAll } from "./View";
import Shield, { shieldCam } from "./Shield";
import Papers, { papersCam } from "./Papers";
import { ICONS } from "./Icons";
import { MOMENT_SCENES } from "./Moments3D";

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

/* Po připojení všech scén je předkompiluje a ohlásí připravenost (úvod hero na to čeká). */
function Precompile() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    let alive = true;
    // dva snímky, ať jsou všechny portály a materiály opravdu v grafu scén
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        precompileAll(gl)
          .catch(() => {})
          .finally(() => alive && markSceneReady());
      })
    );
    return () => void (alive = false);
  }, [gl]);
  return null;
}

export default function Scene() {
  return (
    <Canvas
      className="gl"
      frameloop="never"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => void (gl.autoClear = false)}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 5 }}
    >
      <Driver />
      <View slot={slots.hero} cam={shieldCam}>
        <Shield />
      </View>
      {MOMENT_SCENES.map(({ C, cam }, i) => (
        <View key={`m${i}`} slot={slots.moments[i]} cam={cam}>
          <C />
        </View>
      ))}
      {ICONS.map(({ C, cam }, i) => (
        <View key={i} slot={slots.icons[i]} cam={cam}>
          <C />
        </View>
      ))}
      <View slot={slots.papers} cam={papersCam}>
        <Papers />
      </View>
      <Precompile />
    </Canvas>
  );
}
