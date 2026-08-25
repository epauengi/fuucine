<div align="center">

# FuuCine

*A cinematic, responsive frontend for discovering films.*

**[Explore the live demo](https://fuucine.vercel.app/)**

[![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF.svg?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![SWR](https://img.shields.io/badge/SWR-2-000000.svg)](https://swr.vercel.app/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-E84D8A.svg)](https://motion.dev/)
[![Lucide](https://img.shields.io/badge/Lucide_React-0-F56040.svg)](https://lucide.dev/)

</div>

## What it demonstrates

- API-driven film discovery with search, filters, pagination, and IMDb-based sorting
- Responsive browsing across desktop, tablet, and mobile
- Detail views, Vietsub / Thuyết minh episode selection, and embedded playback
- Accessible dialogs, keyboard navigation, visible focus, and reduced-motion support
- Theme-aware visual system, purposeful motion, loading states, and retry recovery

## Project structure

```text
├── index.html              # Entry HTML and pre-paint theme bootstrap
├── src/
│   ├── App.tsx             # Views, data boundaries, and modal flows
│   ├── main.tsx            # React root, SWR, and motion configuration
│   ├── index.css           # Tailwind and Projection Booth visual system
│   ├── components/ui/      # Theme control
│   └── lib/utils.ts        # Shared cn() utility
├── vite.config.ts          # Development API proxies
└── vercel.json             # Production API rewrites
```

## API proxies

The frontend accesses third-party data through these proxied paths:

| Frontend path | Upstream | Purpose |
| --- | --- | --- |
| `/nguonc-api/*` | `phim.nguonc.com` | Film catalog, search, episodes, playback URLs |
| `/imdb-api/*` | `api.imdbapi.dev` | IMDb rating lookup |
| `/imdb-lookup-api/*` | `imdb.iamidiotareyoutoo.com` | IMDb ID lookup fallback |

Vite proxies these routes in development; Vercel rewrites them in production. Other hosts require equivalent reverse-proxy rules.

## Deployment

The live demo is deployed on Vercel. [`vercel.json`](vercel.json) provides the third-party API rewrites required by the frontend.

## Content notice

> [!IMPORTANT]
> FuuCine is a frontend demonstration project. Film metadata, artwork, playback links, and embedded media originate from third-party services, including NguonC and IMDb-related endpoints. This repository neither hosts nor controls that content, its availability, advertisements, or embedded media behavior.

It demonstrates frontend engineering, UI/UX design, and responsive interaction patterns — not a production streaming service.

---

Created by [@epauengi](https://github.com/epauengi)
