# Refonte PC Remote - feuille de route

Objectif final :

- une application desktop avec interface graphique ;
- un installateur Windows `.exe` ;
- une application mobile refaite en React Native + TypeScript + SCSS ;
- une application mobile distribuable en `.apk` ;
- une communication directe mobile <-> desktop, sans backend distant ;
- une découverte du desktop malgré les changements d'adresse IP du DHCP ;
- une connexion validée par un premier message de test avant d'implémenter
  toutes les commandes.

## 0. Décisions et périmètre

- [ ] Confirmer que le desktop est conservé et que le mobile est entièrement
  refait.
- [ ] Confirmer que le backend distant est supprimé du produit final.
- [ ] Définir les systèmes ciblés : Windows pour le desktop, Android pour le
  premier `.apk`.
- [ ] Décider si iOS sera prévu plus tard.
- [ ] Définir les fonctions incluses dans la première version fonctionnelle.
- [ ] Définir les fonctions explicitement reportées après la connexion de base.
- [ ] Décider si la communication fonctionne uniquement sur le même réseau
  local.
- [ ] Décider si une connexion hors réseau local sera un objectif ultérieur.
- [ ] Décider le niveau de sécurité de la première version et les protections
  obligatoires avant distribution.

## 1. Nettoyage de l'existant

- [x] Faire un état des lieux des applications `desktop`, `mobile` et
  `backend`.
- [x] Identifier les fonctionnalités desktop à conserver.
- [x] Identifier les éléments mobiles à réutiliser uniquement si nécessaire.
- [x] Supprimer le code du backend.
- [x] Supprimer les dépendances du backend.
- [x] Supprimer les scripts de démarrage et la documentation qui dépendent du
  backend.
- [x] Supprimer les dépendances Socket.IO devenues inutiles.
- [x] Retirer les identifiants, tokens et URLs de démonstration codés en dur.
- [x] Mettre à jour le `.gitignore`.
- [x] Mettre à jour le `README.md`.
- [x] Vérifier que le dépôt ne contient plus de référence fonctionnelle au
  backend supprimé.

## 2. Architecture de communication locale

- [ ] Choisir le protocole de communication directe : WebSocket, TCP ou autre.
- [ ] Définir le port utilisé par le desktop.
- [ ] Définir le format des messages échangés.
- [ ] Définir les types de messages : découverte, connexion, test, commande,
  réponse et erreur.
- [ ] Définir une version de protocole pour permettre les évolutions.
- [ ] Définir les délais d'expiration et la reconnexion automatique.
- [ ] Définir le comportement lors de la fermeture du desktop ou du mobile.
- [ ] Définir les messages d'erreur compréhensibles pour l'utilisateur.
- [ ] Définir les règles minimales de sécurité avant la version distribuée.
- [ ] Ajouter des tests du protocole indépendants des interfaces.

## 3. Découverte du desktop malgré le DHCP

- [ ] Choisir la technologie de découverte locale : mDNS/Bonjour, DNS-SD ou
  autre solution compatible Windows et Android.
- [ ] Définir le nom de service publié par le desktop.
- [ ] Publier le nom du PC et le port du service.
- [ ] Ne pas dépendre d'une adresse IP fixe dans la configuration.
- [ ] Définir le contenu du QR code.
- [ ] Afficher le QR code dans l'application desktop.
- [ ] Prévoir un mode de connexion manuelle par adresse locale en secours.
- [ ] Gérer les réseaux qui bloquent ou isolent la découverte mDNS.
- [ ] Tester la reconnexion après changement d'adresse DHCP.
- [ ] Tester plusieurs PC présents sur le même réseau.

## 4. Refonte de l'application mobile

- [ ] Vider ou recréer l'interface mobile sans conserver l'ancien parcours.
- [ ] Définir l'architecture React Native.
- [ ] Utiliser TypeScript avec typage strict.
- [ ] Définir l'organisation des écrans, composants et services.
- [ ] Mettre en place la gestion SCSS ou la solution SCSS compatible retenue
  pour React Native.
- [ ] Définir les variables de thème : couleurs, espacements, tailles et
  typographies.
- [ ] Créer l'écran d'accueil.
- [ ] Créer l'écran de scan du QR code.
- [ ] Créer l'écran de sélection d'un PC découvert.
- [ ] Créer l'écran de connexion manuelle en secours.
- [ ] Créer l'état visuel : recherche, connexion, connecté, erreur et
  déconnecté.
- [ ] Enregistrer localement le dernier PC sélectionné si nécessaire.
- [ ] Ajouter la reconnexion propre après perte du réseau.
- [ ] Ajouter les permissions Android nécessaires.
- [ ] Tester l'interface sur différentes tailles d'écran.
- [ ] Tester les cas d'erreur et les appareils sans caméra.

## 5. Première connexion fonctionnelle

- [ ] Démarrer le service local intégré au desktop.
- [ ] Découvrir le desktop depuis le mobile.
- [ ] Scanner le QR code depuis le mobile.
- [ ] Établir une connexion directe mobile <-> desktop.
- [ ] Afficher le nom du PC connecté dans le mobile.
- [ ] Envoyer un message aléatoire depuis le mobile.
- [ ] Afficher le message reçu dans les logs du desktop.
- [ ] Retourner un accusé de réception au mobile.
- [ ] Afficher la confirmation de réception dans l'interface mobile.
- [ ] Tester une déconnexion volontaire.
- [ ] Tester une perte réseau puis une reconnexion.
- [ ] Tester un changement d'adresse IP fourni par DHCP.
- [ ] Valider cette étape avant d'ajouter les boutons de télécommande.

## 6. Fonctionnalités desktop

- [ ] Choisir la technologie d'interface desktop.
- [ ] Créer la fenêtre principale desktop.
- [ ] Ajouter le statut du service réseau.
- [ ] Ajouter le nom du PC affiché à l'utilisateur.
- [ ] Ajouter l'affichage du QR code.
- [ ] Ajouter le bouton de régénération ou de rafraîchissement du QR code si
  nécessaire.
- [ ] Ajouter l'état du mobile connecté.
- [ ] Ajouter les logs utiles dans une vue lisible.
- [ ] Ajouter les réglages réseau nécessaires.
- [ ] Ajouter le démarrage et l'arrêt propres du service.
- [ ] Gérer les erreurs de port, de pare-feu et de permissions.
- [ ] Ajouter une icône et les métadonnées de l'application.
- [ ] Prévoir le démarrage automatique avec Windows si retenu.

## 7. Commandes de télécommande

- [ ] Lister les commandes à supporter.
- [ ] Définir le type TypeScript de chaque commande.
- [ ] Définir les payloads et réponses de chaque commande.
- [ ] Ajouter la validation côté mobile.
- [ ] Ajouter la validation côté desktop.
- [ ] Implémenter les commandes de volume.
- [ ] Implémenter les commandes média.
- [ ] Implémenter les commandes clavier.
- [ ] Implémenter les commandes de fenêtres.
- [ ] Implémenter les commandes YouTube ou les intégrer au périmètre retenu.
- [ ] Afficher le résultat d'exécution dans le mobile.
- [ ] Gérer les commandes échouées, expirées ou interrompues.
- [ ] Ajouter les boutons mobiles progressivement par fonctionnalité.
- [ ] Tester chaque commande sur un vrai PC Windows.

## 8. Qualité et sécurité

- [ ] Ajouter des tests unitaires pour le protocole.
- [ ] Ajouter des tests d'intégration mobile <-> desktop.
- [ ] Ajouter des tests de reconnexion.
- [ ] Tester les erreurs de saisie et les données malformées.
- [ ] Vérifier qu'aucune commande dangereuse n'est exécutée sans validation.
- [ ] Décider si une authentification ou un appairage sécurisé devient
  nécessaire avant publication.
- [ ] Limiter l'écoute au réseau nécessaire.
- [ ] Documenter les règles de pare-feu Windows.
- [ ] Vérifier les logs et ne pas y afficher de données sensibles.
- [ ] Exécuter les vérifications TypeScript, lint et tests existants.
- [ ] Tester sur un réseau Wi-Fi réel avec DHCP.

## 9. Build et installation desktop `.exe`

- [ ] Choisir le framework de packaging desktop.
- [ ] Configurer le nom, la version, l'identifiant et l'icône de l'application.
- [ ] Configurer le build de production.
- [ ] Inclure les ressources nécessaires : interface, QR code, service réseau
  et commandes.
- [ ] Créer l'installateur Windows `.exe`.
- [ ] Configurer le dossier d'installation.
- [ ] Configurer la désinstallation propre.
- [ ] Configurer la gestion des mises à jour si nécessaire.
- [ ] Vérifier les droits administrateur requis.
- [ ] Vérifier l'ajout éventuel de la règle pare-feu.
- [ ] Tester l'installation sur une machine Windows propre.
- [ ] Tester le lancement après redémarrage de Windows.
- [ ] Tester la désinstallation et la suppression des données temporaires.
- [ ] Produire une version desktop signée si la distribution l'exige.

## 10. Build et distribution mobile `.apk`

- [ ] Choisir le mode de build Android : Expo/EAS ou build natif.
- [ ] Configurer le nom, l'identifiant, la version et l'icône de l'application.
- [ ] Configurer les permissions caméra et réseau local.
- [ ] Configurer les variables de build sans secrets codés en dur.
- [ ] Générer un `.apk` de développement interne.
- [ ] Installer l'APK sur un téléphone Android réel.
- [ ] Tester le scan du QR code.
- [ ] Tester la découverte et la connexion au desktop installé.
- [ ] Tester la reconnexion et le changement de réseau.
- [ ] Générer un `.apk` de release.
- [ ] Signer l'application Android avec une clé conservée séparément.
- [ ] Tester l'APK de release sur plusieurs appareils.
- [ ] Préparer la distribution directe ou le futur passage sur le Play Store.

## 11. Validation finale

- [ ] Installer le `.exe` sur un PC Windows propre.
- [ ] Ouvrir l'application desktop et vérifier l'interface.
- [ ] Installer l'`.apk` sur un téléphone Android.
- [ ] Scanner le QR code.
- [ ] Vérifier la découverte sans saisir d'IP.
- [ ] Envoyer le message de test et vérifier l'accusé de réception.
- [ ] Exécuter les commandes retenues.
- [ ] Changer l'adresse IP du PC via DHCP et vérifier que la connexion
  fonctionne toujours.
- [ ] Vérifier les erreurs réseau et les messages affichés.
- [ ] Vérifier l'absence de backend dans le fonctionnement final.
- [ ] Vérifier que la désinstallation desktop est propre.
- [ ] Rédiger la documentation d'installation et de dépannage.
- [ ] Marquer la version comme première version fonctionnelle.
