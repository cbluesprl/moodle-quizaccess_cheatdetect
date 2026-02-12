# Règle d’accès au quiz - Détection de triche

## Présentation

**Cheat Detection (Détection de triche)** est un plugin de règle d’accès pour l’activité Quiz de Moodle.  
Il surveille le comportement des étudiants pendant leurs tentatives afin d’identifier des schémas potentiellement suspects.

Le plugin collecte différents signaux comportementaux tels que :

- Temps passé par question
- Événements de perte de focus de la page
- Actions de copie sur le texte de la question
- Détection d’extensions de navigateur suspectes
- Métriques comportementales globales de session

Les données collectées sont agrégées et affichées dans les pages de relecture et de rapports du quiz pour les enseignants et administrateurs.

---

## Fonctionnalités

- Activation automatique lorsque le quiz est configuré avec **"Une question par page"**
- Détection de :
    - Pertes de focus
    - Tentatives de copie
    - Présence d’extensions de navigateur
- Métriques comportementales par question
- Résumé détaillé par tentative
- Amélioration des rapports enseignants via module JavaScript AMD
- Implémentation conforme à la Privacy API (RGPD)

---

## Prérequis

- Moodle 4.x ou supérieur
- Activité Quiz activée
- JavaScript activé dans le navigateur des utilisateurs

---

## Installation

### Méthode 1 – Installation manuelle

1. Copier le dossier du plugin dans : mod/quiz/accessrule/cheatdetect
2. Aller dans : Administration du site - Notifications 

3. Finaliser le processus d’installation.

---

### Méthode 2 – Installation via ZIP

1. Compresser le dossier `cheatdetect`.
2. Aller dans : Administration du site - Plugins - Installer des plugins
3. Importer le fichier ZIP.
4. Suivre les instructions d’installation.

---

## Configuration

Aucune configuration globale n’est nécessaire.

Le plugin s’active automatiquement lorsque :

- Le paramètre **Questions par page** est défini sur **1 (Une question par page)**.

Si une autre disposition est sélectionnée, un message d’avertissement s’affiche et la surveillance n’est pas activée.

---

## Utilisation

### Pour les enseignants

1. Créer ou modifier un quiz.
2. Définir **Questions par page = 1**.
3. Enregistrer le quiz.
4. Pendant les tentatives des étudiants, la surveillance est automatiquement active.
5. Consulter les données comportementales dans :
    - La page de relecture de tentative
    - La page de relecture par question
    - Les rapports améliorés du quiz

---

## Données affichées dans les rapports

- Temps total passé par question
- Pourcentage du temps total de la tentative
- Nombre de copies
- Nombre de pertes de focus
- Extensions détectées
- Nombre total d’événements suspects

---

## Confidentialité (Privacy / RGPD)

Ce plugin enregistre des données comportementales liées aux tentatives de quiz.

Les données stockées incluent :

- ID de tentative
- ID utilisateur
- ID du quiz
- Numéro de question (slot)
- Métriques comportementales
- Journaux d’événements
- Informations sur les extensions détectées

Le plugin implémente la Privacy API de Moodle et prend en charge :

- L’export des données utilisateur
- La suppression des données utilisateur

---

## Limitations

- Nécessite obligatoirement le mode **"Une question par page"**
- Dépend du JavaScript côté navigateur
- Ne peut pas détecter les appareils externes ou les logiciels d’enregistrement d’écran

---

## Avertissement de sécurité

Ce plugin fournit uniquement des **indicateurs comportementaux**.

Il ne constitue pas une preuve formelle de triche, mais un outil d’aide à l’identification de comportements potentiellement suspects.

---

## Informations développeur

Nom du composant : `quizaccess_cheatdetect`  
Type : Plugin de règle d’accès pour Quiz  
Namespace : `quizaccess_cheatdetect`

---

## Licence

GNU GPL v3 ou ultérieure

---

## Auteur

CBlue SRL  
gnormand@cblue.be
abrichard@cblue.be

## Documentation

Documentation complète disponible : 

- English: docs/en/user-guide.md
- Français : docs/fr/guide-utilisateur.md
