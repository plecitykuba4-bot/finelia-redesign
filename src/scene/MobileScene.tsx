import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Slot } from "./state";
import type { Cam } from "./View";

/* Mobil: každá 3D ukázka má vlastní plátno přímo uvnitř svého rámečku.
   Dotykový scroll běží mimo JavaScript, takže jedno pevné plátno přes obrazovku se za stránkou opožďuje
   a objekty ujíždějí do textu. Plátno v rámečku se posouvá spolu se stránkou a rámeček ho ořízne. */

/* Před prvním snímkem zkompiluje shadery, ať se scéna nezasekne při prvním vykreslení. */
function Compile({ onReady }: { onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let alive = true;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        gl.compileAsync(scene, camera)
          .catch(() => {})
          .finally(() => alive && onReady());
      })
    );
    return () => void (alive = false);
  }, [gl, scene, camera, onReady]);
  return null;
}

/* Vykreslení převezme sám (priorita 1): jen když je scéna připravená a rámeček na obrazovce.
   Průhlednost při odhalení karty řeší CSS rodiče, scény jen potřebují vědět, že běží. */
function Render({ slot, on }: { slot: Slot; on: { current: boolean } }) {
  useFrame(({ gl, scene, camera }) => {
    if (!on.current) return;
    slot.alpha = 1;
    gl.render(scene, camera);
  }, 1);
  return null;
}

function Stage({ slot, cam, C }: { slot: Slot; cam: Cam; C: () => React.JSX.Element }) {
  const el = slot.ref.current;
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const on = useRef(false);
  on.current = visible && ready;
  useEffect(() => {
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [el]);
  if (!el) return null;
  return createPortal(
    <Canvas
      className="stage-gl"
      // mimo obrazovku plátno nekreslí (viz Render), smyčka scény běží dál jen s levnými výpočty
      frameloop="always"
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: cam.fov, position: cam.pos, near: 0.1, far: 60 }}
      onCreated={({ camera }) => camera.lookAt(...cam.look)}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <Compile onReady={onReady} />
      <Render slot={slot} on={on} />
      <C />
    </Canvas>,
    el
  );
}

export default function MobileScene({ stages }: { stages: { slot: Slot; cam: Cam; C: () => React.JSX.Element }[] }) {
  return (
    <>
      {stages.map((s, i) => (
        <Stage key={i} {...s} />
      ))}
    </>
  );
}
