# Finelia – návrh webu

Návrh nového webu pro [finelia.cz](https://finelia.cz) (daně, účetnictví, mzdy, poradenství) s drobnými 3D animacemi.

- Vite + React 19 + React Three Fiber (three.js) + GSAP/ScrollTrigger + Lenis
- Jeden WebGL canvas, každá 3D ukázka kreslí do svého DOM prvku (`src/scene/View.tsx`)
- 3D se připravuje a kompiluje až po úvodní animaci, aby nic nezasekávalo náběh stránky

```bash
npm install
npm run dev
npm run build
```
