// ─────────────────────────────────────────────────────────────────────────────
// telegramSetup.js
//
// Generates all Telegram setup content for a launched token.
// Since we can't auto-create Telegram groups (requires human account),
// we generate everything the user needs to do it in under 2 minutes.
// ─────────────────────────────────────────────────────────────────────────────

// Generate the full Telegram setup package for a token
function generateTelegramSetup(draft, token) {
  const name = draft.name
  const ticker = draft.ticker
  const chain = token.chain.toUpperCase()
  const address = token.contract_address
  const explorerUrl = token.chain === 'bsc'
    ? `https://testnet.bscscan.com/token/${address}`
    : `https://solscan.io/token/${address}`

  // ── Group name ──────────────────────────────────────────────────────────────
  const groupName = `${name} | $${ticker}`

  // ── Group bio ───────────────────────────────────────────────────────────────
  const groupBio = draft.tg_bio ||
    `The official community for $${ticker} on ${chain}. Join the movement.`

  // ── Pinned message ──────────────────────────────────────────────────────────
  const pinnedMessage =
    `🚀 *Welcome to ${name} ($${ticker})*\n\n` +
    `${draft.description || `The official community for $${ticker}`}\n\n` +
    `*Contract Address:*\n\`${address}\`\n\n` +
    `*Chain:* ${chain}\n` +
    `*Supply:* ${Number(draft.total_supply).toLocaleString()} $${ticker}\n\n` +
    `🔍 *Verify Contract:* ${explorerUrl}\n\n` +
    `*Rules:*\n` +
    `• No spam\n` +
    `• No FUD\n` +
    `• English only in main chat\n` +
    `• DYOR — this is a memecoin\n\n` +
    `Built with 1launch`

  // ── Welcome bot message ─────────────────────────────────────────────────────
  const welcomeMessage =
    `Welcome to ${name} ($${ticker})!\n\n` +
    `Read the pinned message for all contract info.\n\n` +
    `DYOR — not financial advice.`

  // ── Moderation bot setup commands ───────────────────────────────────────────
  // These work with @Rose bot (most popular TG moderation bot)
  const roseCommands = [
    `/setjoinmsg Welcome to ${name} ($${ticker})! Read the pinned message for contract info. DYOR.`,
    `/setflood 5`,
    `/setfloodaction kick`,
    `/addblacklist spam scam send me|send you|eth giveaway`,
    `/setwarn 3`,
    `/setwarnaction kick`,
  ]

  // ── Deep link to create group ───────────────────────────────────────────────
  // This opens Telegram with the group name pre-suggested in a new chat
  const createGroupDeepLink = `https://t.me`

  // ── Step by step instructions ───────────────────────────────────────────────
  const steps = [
    {
      step: 1,
      title: 'Create Telegram Group',
      instructions: [
        'Open Telegram app',
        'Tap the pencil/compose icon',
        'Select "New Group"',
        `Name it: ${groupName}`,
        'Add at least 1 contact to create (you can remove them after)',
      ],
      copyValue: groupName,
      copyLabel: 'Copy group name',
    },
    {
      step: 2,
      title: 'Set Group Bio',
      instructions: [
        'Open group settings',
        'Tap "Edit"',
        'Paste the bio below into the description field',
      ],
      copyValue: groupBio,
      copyLabel: 'Copy bio',
    },
    {
      step: 3,
      title: 'Create Announcement Channel',
      instructions: [
        'Create a separate Telegram Channel (not group)',
        `Name it: ${name} Announcements`,
        'Link it to your group: Group Settings → Discussion',
      ],
      copyValue: `${name} Announcements`,
      copyLabel: 'Copy channel name',
    },
    {
      step: 4,
      title: 'Pin the Launch Message',
      instructions: [
        'Copy the message below',
        'Send it in your group',
        'Long press → Pin message',
        'Enable "Notify all members"',
      ],
      copyValue: pinnedMessage,
      copyLabel: 'Copy pinned message',
    },
    {
      step: 5,
      title: 'Add @Rose Moderation Bot',
      instructions: [
        'Add @MissRose_bot to your group as admin',
        'Give it Delete Messages + Ban Users permissions',
        'Run the commands below one by one',
      ],
      copyValue: roseCommands.join('\n'),
      copyLabel: 'Copy Rose commands',
    },
  ]

  return {
    groupName,
    groupBio,
    pinnedMessage,
    welcomeMessage,
    roseCommands,
    steps,
    createGroupDeepLink,
  }
}

module.exports = { generateTelegramSetup }
