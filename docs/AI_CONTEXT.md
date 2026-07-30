# AI_CONTEXT.md - Pilotage du projet CMS Headless (Site v1.0 -> CMS)

## 1. Directives & Rôle (Fixe)
- **Rôle :** Expert en développement web senior, spécialisé dans les architectures sur mesure, sécurisées et épurées pour cabinets professionnels (santé/psychanalyse).
- **Contexte initial :** Le site test v1.0 existe déjà et est actuellement hébergé sur GitHub Pages : `https://maziarzendehroudi.github.io/SiteCB/`. Le projet consiste à transformer ce site statique existant en un site administrable via un CMS Headless Git-backed, avant migration vers un nouveau nom de domaine chez OVH.
- **Stack & Architecture :** Frontend React/Vite, stockage des contenus dans des fichiers Markdown (`/content/pages/` et `/content/blog/`) avec frontmatter YAML, interface d'administration modifiant les fichiers via l'API GitHub.
- **Exigences clés :** Sécurité maximale (zéro BDD SQL), indépendance totale et portabilité du client (dépôt GitHub possédé par le client), code propre et respect de l'existant graphique de la v1.0.

## 2. Vue d'ensemble & Stack Technique
- **Framework Frontend :** React (via Vite)
- **Linter :** Oxlint
- **Gestion du Contenu :** Fichiers Markdown (`.md`) avec frontmatter YAML et parsing HTML natif sécurisé pour le frontend.
- **Hébergement & Déploiement :** GitHub Pages / GitHub Actions / OVH
- **CMS Headless :** Intégration Git-backed via l'API REST GitHub (Service de commit automatique, authentification par Token PAT, éditeurs dédiés pour le blog et les médias).

## 3. Architecture des Dossiers
`SiteCB/`
`├── AI_CONTEXT.md`
`├── README.md`
`├── a-propos.html`
`├── approches.html`
`├── article-couple.html`
`├── article-creer.html`
`├── article-difference.html`
`├── article-doudou.html`
`├── article-jeu.html`
`├── article-langage.html`
`├── article-secret.html`
`├── assets`
`│   └── img`
`│       ├── ados1.jpg`
`│       ├── ados2.jpg`
`│       ├── adultes1.jpg`
`│       ├── adultes2.jpg`
`│       ├── apropos1.jpg`
`│       ├── apropos2.jpg`
`│       ├── article-couple.jpg`
`│       ├── article-creer.jpg`
`│       ├── article-difference.jpg`
`│       ├── article-doudou.jpg`
`│       ├── article-jeu.jpg`
`│       ├── article-langage.jpg`
`│       ├── article-secret.jpg`
`│       ├── cadre1.jpg`
`│       ├── cadre2.jpg`
`│       ├── cadre3.jpg`
`│       ├── cadre4.jpg`
`│       ├── enfants1.jpg`
`│       ├── enfants2.jpg`
`│       ├── foret1.jpg`
`│       ├── foret2.jpg`
`│       ├── foret3.jpg`
`│       ├── foret4.jpg`
`│       ├── parents1.jpg`
`│       └── parents2.jpg`
`├── blog.html`
`├── cadre-et-tarifs.html`
`├── contact.html`
`├── content`
`│   ├── blog`
`│   │   ├── article-couple.md`
`│   │   ├── article-difference.md`
`│   │   ├── article-doudou.md`
`│   │   ├── article-jeu.md`
`│   │   ├── article-langage.md`
`│   │   └── article-secret.md`
`│   └── pages`
`│       ├── a-propos.md`
`│       ├── blog.md`
`│       ├── cadre-et-tarifs.md`
`│       ├── contact.md`
`│       ├── home.md`
`│       ├── pour-qui-adolescents.md`
`│       ├── pour-qui-adultes.md`
`│       ├── pour-qui-enfants.md`
`│       └── pour-qui.md`
`├── docs`
`│   ├── architecture.md`
`│   └── user-guide.md`
`├── index.html`
`├── package-lock.json`
`├── package.json`
`├── pour-qui-adolescents.html`
`├── pour-qui-adultes.html`
`├── pour-qui-enfants.html`
`├── pour-qui.html`
`├── public`
`│   ├── favicon.svg`
`│   └── icons.svg`
`├── robots.txt`
`├── sitemap.xml`
`├── src`
`│   ├── App.css`
`│   ├── App.jsx`
`│   ├── assets`
`│   │   ├── hero.png`
`│   │   ├── react.svg`
`│   │   └── vite.svg`
`│   ├── components`
`│   │   ├── AdminDashboard.jsx`
`│   │   ├── AdminLogin.jsx`
`│   │   ├── BlogManager.jsx`
`│   │   ├── MediaManager.jsx`
`│   │   └── PageEditor.jsx`
`│   ├── index.css`
`│   ├── main.jsx`
`│   └── services`
`│       ├── contentService.js`
`│       └── githubService.js`
`├── style.css`
`└── vite.config.js`

## 4. État Actuel du Backlog
| ID | Module / Tâche | Statut |
| :--- | :--- | :--- |
| **BK-01** | Audit et Extraction des Contenus de la v1.0 existante | **Réalisé** |
| **BK-02** | Refactorisation du Frontend React (lecture des Markdown) | **Réalisé** |
| **BK-03** | Service API GitHub (Commit automatique) | **Réalisé** |
| **BK-04** | Authentification Admin (Token GitHub) | **Réalisé** |
| **BK-05** | Interface Dashboard Admin (UI) | **Réalisé** |
| **BK-06** | Éditeur des Pages Statiques | **Réalisé** |
| **BK-07** | Gestionnaire d'Articles de Blog (CRUD) | **Réalisé** |
| **BK-08** | Gestion et Upload des Images | **Réalisé** |
| **BK-09** | Pipeline CI/CD et Déploiement OVH | **Réalisé** |
| **BK-10** | Recette, Bascule Domaine et Livraison Client | **À faire** |
| **BK-11** | Ajustement et robustesse du Service GitHub (gestion UTF-8 et encodage) | **Réalisé** |
| **BK-12** | Configuration des secrets et des variables d'environnement CI/CD OVH | **Réalisé** |
| **BK-13** | Configuration des Secrets sur le dépôt GitHub | **À faire** |
| **BK-14** | Vérification et ajustement de l'emplacement des fichiers racines sur l'hébergeur OVH (`./` vs `www/` ou `public_html/`) | **À faire** |
| **BK-15** | Automatisation du déploiement GitHub Pages via GitHub Actions et correction du routage SPA / Base Vite | **Réalisé** |
| **BK-16** | Correction de l'authentification admin (`AdminLogin.jsx` - compatibilité des props de succès) | **Réalisé** |
| **BK-17** | Restitution intégrale de la mise en page d'origine v1.0 (Home, À propos, Pour qui / sous-pages, Cadre & Tarifs, Blog & Articles complets) | **Réalisé** |
| **BK-18** | Remplacement de `gray-matter` par un parseur frontmatter natif navigateur dans `contentService.js` (suppression des erreurs de build Rolldown/Buffer) | **Réalisé** |