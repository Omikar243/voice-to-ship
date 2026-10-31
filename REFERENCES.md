# Implementation references

- **Lenis** — https://lenis.dev/ and https://github.com/darkroomengineering/lenis/blob/main/README.md. The official site presents Lenis as a lightweight smooth-scroll library, designed to preserve normal scrolling behavior and accessibility. This project uses it only when the visitor has not requested reduced motion.
- **React Bits tools** — https://reactbits.dev/tools. The supplied tools include Background Studio and Texture Lab for tuning/exporting motion and texture treatments. The site instead uses a small CSS grain layer and a custom SVG so its visual system stays light and tied to the content.
- **React Bits Blur Text** — https://reactbits.dev/text-animations/blur-text and https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/TextAnimations/BlurText/BlurText.tsx. The project adapts the word-by-word blur-to-focus reveal pattern using Motion, with one accessible full-text label and reduced-motion support.
- **Vanta.js** — https://www.vantajs.com/. The official page notes that WebGL effects can be slow on older computers, recommends a background fallback on mobile, and cautions against stacking too many effects. Vanta Fog is therefore isolated to the hero and initialized only on wider screens when reduced motion is off; the CSS background remains the fallback.
- **Spline backgrounds** — https://community.spline.design/tag/Background. Used only as a visual reference for restrained ambience; no Spline scene is embedded.

The portfolio's recurring line is a native SVG. It is not rendered in 3D. Its accent color, warm orange `#FF8A42`, comes from the supplied portfolio direction.
