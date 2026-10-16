# Abdessamad Bencheraik — Portfolio

Personal portfolio of Abdessamad Bencheraik, Software Engineer in Rabat: enterprise BPM (Appian), systems integration, full-stack and mobile development, and applied AI.

**Live site:** https://bencabdessamad.github.io/PortfolioBpm

## Stack
- Vanilla HTML, CSS and JavaScript, no build step and no dependencies
- Hero and contact visuals: procedural 3D scene drawn on Canvas 2D (`js/main.js`, `createCore`)
- Expertise constellation, architecture diagrams and the forecast illustration are generated from data objects in `js/main.js` (`DOMAINS`, `DIAGRAMS`)
- Fonts: Bricolage Grotesque, Instrument Sans, JetBrains Mono (Google Fonts)
- Contact form: Formspree (form id `mkokylpj`)
- Deployed by GitHub Actions to GitHub Pages on every push to `main`

## Run locally
```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Editing content
- Text, projects, experience and education live in `index.html`.
- Expertise domains and tools: `DOMAINS` in `js/main.js`.
- Project diagrams: `DIAGRAMS` in `js/main.js`.

Animations respect `prefers-reduced-motion`, and the canvas pauses when off-screen.
