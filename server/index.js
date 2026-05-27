import express from 'express'
import webpush from 'web-push'
import cors from 'cors'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, writeFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '.env') })

const app = express()
app.use(cors())
app.use(express.json())

let vapidSubject = process.env.VAPID_EMAIL || '';
if (vapidSubject && !vapidSubject.startsWith('mailto:') && !vapidSubject.startsWith('http://') && !vapidSubject.startsWith('https://')) {
  vapidSubject = `mailto:${vapidSubject}`;
}

webpush.setVapidDetails(
  vapidSubject,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// ── File-backed subscription store ─────────────────────────────────────────
const STORE_PATH = join(__dirname, 'subscriptions.json')

function loadSubscriptions() {
  try {
    const data = JSON.parse(readFileSync(STORE_PATH, 'utf8'))
    return new Map(Object.entries(data))
  } catch {
    return new Map()
  }
}

function saveSubscriptions(subs) {
  try {
    writeFileSync(STORE_PATH, JSON.stringify(Object.fromEntries(subs), null, 2))
  } catch (e) {
    console.error('[push] Failed to save subscriptions:', e.message)
  }
}

const subscriptions = loadSubscriptions()
console.log(`[push] Loaded ${subscriptions.size} subscription(s) from disk`)


// ── GET /vapid-public-key ── Return public key for frontend subscription
app.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY })
})

// ── POST /subscribe ── Register a push subscription for a peer
app.post('/subscribe', (req, res) => {
  const { peerId, subscription } = req.body
  if (!peerId || !subscription) {
    return res.status(400).json({ error: 'Missing peerId or subscription' })
  }
  subscriptions.set(peerId, subscription)
  saveSubscriptions(subscriptions)
  console.log(`[push] Subscribed: ${peerId} (total: ${subscriptions.size})`)
  res.status(201).json({ success: true })
})

// ── POST /unsubscribe ── Remove a peer's push subscription
app.post('/unsubscribe', (req, res) => {
  const { peerId } = req.body
  if (peerId) {
    subscriptions.delete(peerId)
    saveSubscriptions(subscriptions)
    console.log(`[push] Unsubscribed: ${peerId}`)
  }
  res.json({ success: true })
})

// ── POST /notify ── Send a push notification to a target peer
app.post('/notify', async (req, res) => {
  const { targetPeerId, callerPeerId } = req.body
  if (!targetPeerId || !callerPeerId) {
    return res.status(400).json({ error: 'Missing targetPeerId or callerPeerId' })
  }

  const subscription = subscriptions.get(targetPeerId)
  if (!subscription) {
    console.log(`[push] No subscription for peer: ${targetPeerId}`)
    return res.status(404).json({ error: 'Peer not subscribed to push', available: false })
  }

  const payload = JSON.stringify({
    title: 'Incoming Call',
    body: `Incoming call — tap to answer`,
    callerPeerId,
    targetPeerId,
    url: `/?caller=${callerPeerId}`
  })

  try {
    await webpush.sendNotification(subscription, payload)
    console.log(`[push] Notified ${targetPeerId} about call from ${callerPeerId}`)
    res.json({ success: true })
  } catch (err) {
    console.error('[push] Send error:', err.statusCode, err.body)
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired — clean up
      subscriptions.delete(targetPeerId)
      saveSubscriptions(subscriptions)
    }
    res.status(500).json({ error: 'Failed to send push notification' })
  }
})

// ── Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', subscriptions: subscriptions.size })
})

const PORT = parseInt(process.env.PORT || '3001')
app.listen(PORT, () => {
  console.log(`[push] Push server running on http://localhost:${PORT}`)
  console.log(`[push] VAPID Public Key: ${process.env.VAPID_PUBLIC_KEY?.slice(0, 20)}...`)
})
