/**
 * English translations for tutorial tooltips.
 *
 * Keys match tutorial step IDs from tutorialSteps.ts.
 * Each step has a `content` (main text) and optional `actionHint` (bold CTA).
 */
const tutorialEN = {
  'lightbox-hint': {
    content: 'Images can be opened full-screen with a download option.',
    actionHint: 'Click on any image to open the lightbox',
  },
  'image-lightbox': {
    content: 'The lightbox supports download and full-screen viewing.',
    actionHint: 'Click on the new image to see it in the lightbox',
  },
  'file-upload-hint': {
    content: 'You can share files, images, and documents with contacts.',
    actionHint: 'Try the attach button to send a file',
  },
  'poll-hint': {
    content: 'Polls let team members vote on decisions right in the chat.',
    actionHint: 'Open Team Chat to find the poll and cast your vote',
  },
  'activity-log-hint': {
    content: 'The Activity tab shows subscription requests, reactions, and invitations.',
    actionHint: 'Click the Activity icon in the sidebar to see new events',
  },
  'search-hint': {
    content: 'Search messages across all conversations. Use type filters or "in:Team" to narrow results.',
    actionHint: 'Click the Search icon and try typing "SDK" or "in:Team"',
  },
  'mention-hint': {
    content: 'You were @mentioned in Team Chat — the badge shows unread mentions.',
    actionHint: 'Click on Team Chat to jump to your mention',
  },
  'keyboard-shortcuts-hint': {
    content: 'Fluux has full keyboard navigation. Use Cmd+K to switch panels quickly, or press ? to see all shortcuts.',
    actionHint: 'Try pressing ? to see the keyboard shortcuts',
  },
  'theme-hint': {
    content: 'Customize the look with themes, accent colors, fonts, and custom CSS snippets.',
    actionHint: 'Open Settings > Appearance to try accent colors and theme switching',
  },
  'language-hint': {
    content: 'The UI is available in 30+ languages. Switching is instant.',
    actionHint: 'Try Settings > Language to switch the interface language',
  },
  'message-deletion-hint': {
    content: 'Moderators can delete messages with a reason. Deleted messages show a placeholder.',
    actionHint: 'Check Design Review — a message was moderated by Oliver',
  },
  'muc-management-hint': {
    content: 'As room owner, you can manage roles, kick/ban users, and configure the room.',
    actionHint: "In Team Chat, click a member's name to see moderation options",
  },
  'room-members-hint': {
    content: 'The Members panel shows owners, admins, members, and banned users.',
    actionHint: 'Try the Members button in the room header',
  },
  'admin-hint': {
    content: 'The Admin dashboard lets server operators manage users, rooms, and server settings.',
    actionHint: 'Click the Admin icon in the sidebar to explore',
  },
  'xmpp-console-hint': {
    content: 'For developers: the XMPP console shows all protocol traffic — stanzas in and out.',
    actionHint: 'Open Settings > XMPP Console to see live XMPP packets',
  },
  'history-hint': {
    content: 'Messages are synced from the server archive (MAM). Scroll up to load earlier history.',
    actionHint: 'Scroll to the top of any conversation to see full message history',
  },
  'tour-complete': {
    content: "That's the tour! All features are live — explore freely. Enjoy Fluux! ✨",
  },
  skip: 'Skip',
} as const

export default tutorialEN
