import express from 'express.js';

const router = express.Router();

// Get all users (superadmin only)
router.get('/', (_req, res) => {
  res.json({ message: 'List of all users' });
});

// Get user by ID
router.get('/:id', (_req, res) => {
  res.json({ message: `User ${_req.params.id} details` });
});

// Update user
router.put('/:id', (_req, res) => {
  res.json({ message: `User ${_req.params.id} updated` });
});

// Delete user
router.delete('/:id', (_req, res) => {
  res.status(204).send();
});

export default router;
