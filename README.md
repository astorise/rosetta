# 🕸️ Rosetta: Legacy RAG Pipeline

Rosetta est un pipeline de préparation de données asynchrone (Event-Driven) conçu pour alimenter un réseau d'agents IA (LLMs légers sous k3s). Son but est de faciliter le rétro-engineering de bases de code legacy complexes (Java 6, Pacbase, Tapestry 5.4).

Ce projet implémente le pattern architectural **Teacher-Student** : des microservices Rust serverless utilisent un LLM de pointe ("Teacher") pour nettoyer, résumer et aplatir sémantiquement les vieilles documentations et le code source compilé, afin de créer une base de connaissances vectorielle parfaite pour des LLMs locaux ("Students").

## 🚀 Architecture Principale

Le pipeline est hébergé sur Google Cloud Platform et déclenché par des événements Firebase Storage :

* **Ingestion :** Dépôt de fichiers bruts (`.pdf`, `.zip`, `.jar`) dans Firebase Storage.
* **Orchestration :** Google Eventarc route les événements vers le bon microservice Cloud Run.
* **Traitement (Rust) :** Des workers ultra-légers extraient le texte, gèrent la concurrence (Sémaphores), décompilent à la volée, et interrogent un LLM de pointe.
* **Structuration :** Création de fichiers Markdown enrichis d'un *YAML Frontmatter* pour le filtrage par métadonnées (Hybrid Search).
* **Persistance :** Sauvegarde des Markdowns dans un bucket de destination et audit dans Firestore.

## ✨ Fonctionnalités Clés

* **Aplatissement Sémantique (Semantic Flattening) :** Réduction des arbres d'appels complexes des librairies open-source (`.jar`) vers des appels natifs Java 6 pour économiser les tokens des petits LLMs.
* **Streaming de ZIP asynchrone :** Décompression à la volée des archives Javadoc/HTML sans saturer la RAM, avec nettoyage HTML (`scraper`).
* **Tagging Sémantique :** Fusion de métadonnées techniques (Rust) et de tags conceptuels (LLM) dans un en-tête YAML pour éviter les hallucinations croisées dans la base vectorielle.
* **Spec-Driven Development :** Projet conçu et généré via le standard **OpenSpec** pour garantir l'alignement architectural.

## 📂 Structure du Dépôt

Ce dépôt est un Cargo Workspace Rust contenant une librairie partagée et trois binaires distincts :

| Composant | Description | Cible (Filtre) |
| :--- | :--- | :--- |
| `shared-gcp` | Librairie commune (Axum, Désérialisation CloudEvents, Firestore). | N/A |
| `worker-pdf` | Extracteur de texte pour les manuels techniques et spécifications. | `*.pdf` |
| `worker-html` | Streamer et nettoyeur d'archives de documentation (Javadoc/Tapestry). | `*.zip` |
| `worker-jar` | Décompilateur (`cfr.jar`) et aplatisseur sémantique de bytecode. | `*.jar` |

## 🛠️ Déploiement (CI/CD)

Le déploiement est totalement automatisé via **GitHub Actions** :
1. Authentification sécurisée via GCP Workload Identity Federation (OIDC).
2. Build des images Docker multi-stages (distroless / debian-slim).
3. Push vers Google Artifact Registry.
4. Déploiement sur Google Cloud Run.
5. Configuration des triggers Eventarc.

## ⚙️ Prérequis pour le développement local

* [Rust](https://rustup.rs/) (Édition 2021)
* [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (`gcloud`) configuré avec un projet actif.
* (Optionnel) Un outil compatible OpenSpec comme Antigravity ou Cursor pour le développement assisté.

---
*Ce projet est la fondation d'un écosystème RAG k3s multi-agents.*