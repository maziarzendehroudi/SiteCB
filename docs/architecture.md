# Architecture et Backlog du Projet : SiteCB (Camille Bongue)

## 1. Vue d'ensemble & Stack Technique
* **Framework Frontend :** React (via Vite)
* **Linter :** Oxlint
* **Gestion du Contenu :** Fichiers Markdown (`.md`) avec frontmatter (`gray-matter`) et parsing HTML (`marked`)
* **Hébergement & Déploiement :** GitHub Pages / GitHub Actions / OVH
* **CMS Headless :** Intégration Git-backed via l'API REST GitHub (Service de commit automatique, authentification par Token PAT, éditeurs dédiés pour les pages, le blog et les médias).

## 2. Architecture des Dossiers
```text
SiteCB/
├── .github/
│   └── workflows/
│       └── deploy.yml        # Pipeline CI/CD pour build et déploiement OVH
├── content/
│   ├── pages/
│   │   ├── accueil.md
│   │   ├── cabinet.md
│   │   ├── approche.md
│   │   ├── home.md
│   │   ├── pour-qui.md
│   │   ├── contact.md
│   │   ├── a-propos.md
│   │   ├── cadre-et-tarifs.md
│   │   └── blog.md
│   └── blog/                 # Dossier des articles de blog (Markdown)
├── public/
│   └── uploads/              # Bibliothèque des médias et images téléversés
├── src/
│   ├── components/       # Composants d'administration (AdminLogin, AdminDashboard, PageEditor, BlogManager, MediaManager)
│   ├── services/
│   │   ├── contentService.js # Service de lecture des fichiers Markdown
│   │   └── githubService.js  # Service de gestion des commits et API GitHub
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
└── package.json