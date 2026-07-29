# Architecture et Backlog du Projet : SiteCB (Camille Bongue)

## 1. Vue d'ensemble & Stack Technique
* **Framework Frontend :** React (via Vite)
* **Linter :** Oxlint
* **Gestion du Contenu :** Fichiers Markdown (`.md`) avec frontmatter (`gray-matter`) et parsing HTML (`marked`)
* **Hébergement & Déploiement :** GitHub Pages / GitHub Actions / OVH

## 2. Architecture des Dossiers
```text
SiteCB/
├── content/
│   └── pages/
│       ├── home.md
│       ├── pour-qui.md
│       ├── contact.md
│       ├── a-propos.md
│       ├── cadre-et-tarifs.md
│       └── blog.md
├── src/
│   ├── components/       # Composants d'administration (Login, Dashboard, Editors)
│   ├── services/
│   │   └── contentService.js # Service de lecture des fichiers Markdown
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
└── package.json