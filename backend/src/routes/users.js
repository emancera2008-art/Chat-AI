import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, name, email, role, department, active, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

router.post('/', (req, res) => {
  const { name, email, password, role = 'user', department = 'Sales' } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password required' });

  const hash = bcrypt.hashSync(password, 10);
  const db = getDb();
  try {
    const result = db.prepare(
      'INSERT INTO users (name, email, password, role, department) VALUES (?, ?, ?, ?, ?)'
    ).run(name, email.toLowerCase(), hash, role, department);
    res.status(201).json({ id: result.lastInsertRowid, name, email, role, department });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/:id', (req, res) => {
  const { name, email, role, department, active, password } = req.body;
  const db = getDb();

  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.params.id);
  }

  db.prepare('UPDATE users SET name = ?, email = ?, role = ?, department = ?, active = ? WHERE id = ?')
    .run(name, email?.toLowerCase(), role, department, active ? 1 : 0, req.params.id);

  res.json({ message: 'User updated' });
});

router.delete('/:id', (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  const db = getDb();
  db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deactivated' });
});

export default router;
