import express from 'express.js';

const router = express.Router();

// Get all feature flags
router.get('/', (_req, res) => {
  res.json({ message: 'List of all feature flags' });
});

// Get feature flag by name
router.get('/:name', ( _req, res) => {
  res.json({ message: `Feature flag ${_req.params.name} details` });
});

// Create or update feature flag
router.post('/', (_req, res) => {
  res.status(201).json({ message: 'Feature flag created/updated' });
});

// Delete feature flag
router.delete('/:name', (_req, res) => {
  res.status(204).send();
});

export default router;
