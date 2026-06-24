import { Router } from 'express';
import { getDb } from '../db/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const words = db.prepare(`
    SELECT e.id, e.word, e.reason, e.created_at, u.name as added_by_name
    FROM excluded_words e JOIN users u ON e.added_by = u.id
    ORDER BY e.created_at DESC
  `).all();
  res.json(words);
});

router.post('/', authenticate, requireAdmin, (req, res) => {
  const { word, reason } = req.body;
  if (!word) return res.status(400).json({ error: 'Word required' });

  const db = getDb();
  try {
    const result = db.prepare('INSERT INTO excluded_words (word, reason, added_by) VALUES (?, ?, ?)')
      .run(word.trim().toLowerCase(), reason || null, req.user.id);
    res.status(201).json({ id: result.lastInsertRowid, word: word.trim().toLowerCase() });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Word already excluded' });
    res.status(500).json({ error: 'Failed to add exclusion' });
  }
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM excluded_words WHERE id = ?').run(req.params.id);
  res.json({ message: 'Exclusion removed' });
});

export default router;
