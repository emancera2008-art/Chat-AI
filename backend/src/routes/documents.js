import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb } from '../db/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { parseDocument } from '../services/documentParser.js';

const router = Router();

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc', '.txt', '.md', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Unsupported file type'));
  },
});

router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const docs = db.prepare(`
    SELECT d.id, d.name, d.original_name, d.file_type, d.active, d.created_at, u.name as uploaded_by_name
    FROM documents d JOIN users u ON d.uploaded_by = u.id
    ORDER BY d.created_at DESC
  `).all();
  res.json(docs);
});

router.post('/', authenticate, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const content = await parseDocument(req.file.path, req.file.mimetype);
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO documents (name, original_name, file_path, file_type, content, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      req.body.name || req.file.originalname,
      req.file.originalname,
      req.file.path,
      path.extname(req.file.originalname).toLowerCase(),
      content,
      req.user.id
    );
    res.status(201).json({ id: result.lastInsertRowid, message: 'Document uploaded and indexed' });
  } catch (err) {
    fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/toggle', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT active FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  db.prepare('UPDATE documents SET active = ? WHERE id = ?').run(doc.active ? 0 : 1, req.params.id);
  res.json({ message: 'Document status updated', active: !doc.active });
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT file_path FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  try { fs.unlinkSync(doc.file_path); } catch {}
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ message: 'Document deleted' });
});

export default router;
