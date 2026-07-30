# Guide Utilisateur (Espace Administration)

## 1. Accès et Connexion à l'Espace d'Administration
1. Se rendre sur le site public et accéder à l'interface d'administration (via le point d'entrée dédié ou l'URL de l'application).
2. S'authentifier à l'aide de votre Personal Access Token (PAT) GitHub sécurisé (disposant des droits d'écriture `repo`). Le système valide automatiquement les identifiants auprès de l'API REST de GitHub et initialise une session sécurisée via `sessionStorage`.

## 2. Édition des Pages Fixes (Pages Statiques)
- Sélectionner l'onglet **Pages Statiques** dans le menu de l'espace d'administration.
- Choisir la page à modifier dans le gestionnaire.
- Modifier les champs textuels et le contenu au format Markdown.
- Valider l'enregistrement : le service GitHub se charge d'encoder le contenu en UTF-8 et de générer automatiquement un commit sur le dépôt distant, déclenchant la mise à jour du site via le pipeline CI/CD.

## 3. Gestion du Blog et des Articles
- Sélectionner l'onglet **Blog** dans le menu d'administration.
- **Pour créer un nouvel article :** renseigner le frontmatter YAML (titre, date, description) et rédiger le corps de l'article en Markdown.
- **Pour modifier ou supprimer :** sélectionner l'article concerné dans la liste, effectuer les corrections et valider l'enregistrement pour persister les changements sur le dépôt GitHub.

## 4. Gestion et Upload des Images
- Sélectionner l'onglet **Images** dans le menu d'administration (`MediaManager`).
- Permet de téléverser et de gérer les fichiers multimédias stockés dans le dossier `/assets/img/`, prêts à être intégrés dans les pages ou les articles du site.