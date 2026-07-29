# Documentation Technique & Architecture

## 1. Vue d'ensemble de l'architecture
L'architecture repose sur un découplage total entre l'interface publique (statique) et le mécanisme de mise à jour des contenus. Aucun serveur d'application persistant (type Node.js permanent ou PHP/MySQL) n'est requis sur l'hébergement OVH final, ce qui élimine les risques de failles de sécurité par injection ou de corruption de base de données.

```text
[Navigateur Client (Psychanalyste)] 
       │
       ▼ (Interface Admin sécurisée /admin)
[API GitHub REST/GraphQL] 
       │ (Commit & Push automatique)
       ▼
[Dépôt GitHub (Code source + Fichiers .md/.json)]
       │ (Webhook / Build statique)
       ▼
[Hébergement OVH (Site Public optimisé)]