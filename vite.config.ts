import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // 3D se načítá líně; bez tohohle Vite závislosti přeoptimalizuje až za běhu a chunk spadne
  optimizeDeps: {
    include: ["three", "@react-three/fiber", "three/examples/jsm/environments/RoomEnvironment.js", "three/examples/jsm/geometries/RoundedBoxGeometry.js"],
  },
});
