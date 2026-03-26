/**
 * French translations for tutorial tooltips.
 *
 * Keys match tutorial step IDs from tutorialSteps.ts.
 * Each step has a `content` (main text) and optional `actionHint` (bold CTA).
 */
const tutorialFR = {
  'lightbox-hint': {
    content: 'Les images peuvent être affichées en plein écran avec une option de téléchargement.',
    actionHint: 'Cliquez sur une image pour ouvrir la visionneuse',
  },
  'image-lightbox': {
    content: 'La visionneuse permet le téléchargement et l\'affichage en plein écran.',
    actionHint: 'Cliquez sur la nouvelle image pour la voir dans la visionneuse',
  },
  'file-upload-hint': {
    content: 'Vous pouvez partager des fichiers, images et documents avec vos contacts.',
    actionHint: 'Essayez le bouton joindre pour envoyer un fichier',
  },
  'poll-hint': {
    content: 'Les sondages permettent aux membres de voter sur des décisions directement dans le chat.',
    actionHint: 'Ouvrez Team Chat pour trouver le sondage et voter',
  },
  'activity-log-hint': {
    content: 'L\'onglet Activité affiche les demandes d\'abonnement, réactions et invitations.',
    actionHint: 'Cliquez sur l\'icône Activité dans la barre latérale pour voir les événements',
  },
  'search-hint': {
    content: 'Recherchez des messages dans toutes les conversations. Utilisez les filtres ou « in:Team » pour affiner.',
    actionHint: 'Cliquez sur l\'icône Recherche et essayez « SDK » ou « in:Team »',
  },
  'mention-hint': {
    content: 'Vous avez été @mentionné dans Team Chat — le badge indique les mentions non lues.',
    actionHint: 'Cliquez sur Team Chat pour accéder à votre mention',
  },
  'keyboard-shortcuts-hint': {
    content: 'Fluux offre une navigation clavier complète. Utilisez Cmd+K pour changer de panneau, ou ? pour voir tous les raccourcis.',
    actionHint: 'Appuyez sur ? pour voir les raccourcis clavier',
  },
  'theme-hint': {
    content: 'Personnalisez l\'apparence avec des thèmes, couleurs d\'accentuation, polices et extraits CSS.',
    actionHint: 'Ouvrez Paramètres > Apparence pour essayer les couleurs et les thèmes',
  },
  'language-hint': {
    content: 'L\'interface est disponible en plus de 30 langues. Le changement est instantané.',
    actionHint: 'Essayez Paramètres > Langue pour changer la langue de l\'interface',
  },
  'message-deletion-hint': {
    content: 'Les modérateurs peuvent supprimer des messages avec un motif. Les messages supprimés affichent un espace réservé.',
    actionHint: 'Consultez Design Review — un message a été modéré par Oliver',
  },
  'muc-management-hint': {
    content: 'En tant que propriétaire du salon, vous pouvez gérer les rôles, expulser/bannir des utilisateurs et configurer le salon.',
    actionHint: 'Dans Team Chat, cliquez sur le nom d\'un membre pour voir les options de modération',
  },
  'room-members-hint': {
    content: 'Le panneau Membres affiche les propriétaires, administrateurs, membres et utilisateurs bannis.',
    actionHint: 'Essayez le bouton Membres dans l\'en-tête du salon',
  },
  'admin-hint': {
    content: 'Le tableau de bord Admin permet aux opérateurs de gérer les utilisateurs, salons et paramètres du serveur.',
    actionHint: 'Cliquez sur l\'icône Admin dans la barre latérale pour explorer',
  },
  'xmpp-console-hint': {
    content: 'Pour les développeurs : la console XMPP affiche tout le trafic protocolaire — stanzas entrants et sortants.',
    actionHint: 'Ouvrez Paramètres > Console XMPP pour voir les paquets en direct',
  },
  'history-hint': {
    content: 'Les messages sont synchronisés depuis l\'archive du serveur (MAM). Faites défiler vers le haut pour charger l\'historique.',
    actionHint: 'Remontez en haut d\'une conversation pour voir l\'historique complet',
  },
  'tour-complete': {
    content: 'C\'est la fin de la visite ! Toutes les fonctionnalités sont actives — explorez librement. Profitez de Fluux ! ✨',
  },
  skip: 'Passer',
} as const

export default tutorialFR
