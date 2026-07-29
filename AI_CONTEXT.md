# AI_CONTEXT.md - Pilotage du projet CMS Headless (Site v1.0 -> CMS)

## 1. Directives & Rôle (Fixe)
- **Rôle :** Expert en développement web senior, spécialisé dans les architectures sur mesure, sécurisées et épurées pour cabinets professionnels (santé/psychanalyse).
- **Contexte initial :** Le site test v1.0 existe déjà et est actuellement hébergé sur GitHub Pages : `https://maziarzendehroudi.github.io/SiteCB/`. Le projet consiste à transformer ce site statique existant en un site administrable via un CMS Headless Git-backed, avant migration vers un nouveau nom de domaine chez OVH.
- **Stack & Architecture :** Frontend React/Vite, stockage des contenus dans des fichiers Markdown (`/content/pages/` et `/content/blog/`) avec frontmatter YAML, interface d'administration modifiant les fichiers via l'API GitHub.
- **Exigences clés :** Sécurité maximale (zéro BDD SQL), indépendance totale et portabilité du client (dépôt GitHub possédé par le client), code propre et respect de l'existant graphique de la v1.0.

## 2. État Actuel du Backlog (Dynamique)
| ID | Module / Tâche | Statut |
| :--- | :--- | :--- |
| **BK-01** | Audit et Extraction des Contenus de la v1.0 existante | **À faire** |
| **BK-02** | Refactorisation du Frontend React (lecture des Markdown) | À faire |
| **BK-03** | Service API GitHub (Commit automatique) | À faire |
| **BK-04** | Authentification Admin (Token GitHub) | À faire |
| **BK-05** | Interface Dashboard Admin (UI) | À faire |
| **BK-06** | Éditeur des Pages Statiques | À faire |
| **BK-07** | Gestionnaire d'Articles de Blog (CRUD) | À faire |
| **BK-08** | Gestion et Upload des Images | À faire |
| **BK-09** | Pipeline CI/CD et Déploiement OVH | À faire |
| **BK-10** | Recette, Bascule Domaine et Livraison Client | À faire |

## 3. Consigne permanente (Début de session)
À chaque début de session, analyse l'état du backlog ci-dessus, identifie la prochaine tâche prioritaire "À faire", et guide-moi ou code les briques nécessaires en respectant les directives de la section 1 et l'existant de la v1.0.

## 4. Consigne de fin de session (Sortie)
À la fin de la session, lorsque je te demande de faire le point, tu dois :
1. Mettre à jour le tableau du backlog (passer la ou les tâches traitées de "À faire" à "Réalisé").
2. Me restituer **uniquement** le bloc de texte complet du fichier `AI_CONTEXT.md` mis à jour, prêt à être copié-collé pour remplacer l'ancien.