import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const SUBS_PATH = path.resolve(process.cwd(), 'uploads', 'push_subscriptions.json');

function readSubs(): any[] {
  try {
    if (!fs.existsSync(SUBS_PATH)) return [];
    const raw = fs.readFileSync(SUBS_PATH, 'utf8');
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

function writeSubs(subs: any[]) {
  fs.mkdirSync(path.dirname(SUBS_PATH), { recursive: true });
  fs.writeFileSync(SUBS_PATH, JSON.stringify(subs, null, 2), 'utf8');
}

// Save a push subscription for the current user
router.post('/subscribe', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  const sub = req.body;
  if (!sub || !sub.endpoint) return res.status(400).json({ message: 'Invalid subscription' });
  const subs = readSubs();
  const filtered = subs.filter((s: any) => !(s.userId === req.user!.id && s.endpoint === sub.endpoint));
  filtered.push({ userId: req.user.id, ...sub });
  writeSubs(filtered);
  res.status(201).json({ ok: true });
});

// Remove a subscription
router.post('/unsubscribe', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ message: 'Endpoint required' });
  const subs = readSubs().filter((s: any) => !(s.userId === req.user!.id && s.endpoint === endpoint));
  writeSubs(subs);
  res.json({ ok: true });
});

export default router;

