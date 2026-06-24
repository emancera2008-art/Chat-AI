import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure data directory exists
fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });

import { getDb } from './db/database.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import documentRoutes from './routes/documents.js';
import exclusionRoutes from './routes/exclusions.js';
import chatRoutes from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// Serve built frontend from backend (production / single-server mode)
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

// Initialize DB
getDb();

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/exclusions', exclusionRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Privacy info endpoint — confirms data handling policy to the frontend
app.get('/api/privacy', (req, res) => {
  res.json({
    dataTraining: false,
    dataStorageLocation: 'local — all conversations, documents, and user data are stored only on this server',
    thirdPartySharing: 'none — chat messages are sent to the Anthropic API for inference only, with training opted out via API header',
    anthropicApiPolicy: 'https://www.anthropic.com/policies/api-data-usage',
    retentionPolicy: 'Conversation history is stored locally and can be deleted at any time by the user.',
  });
});

// SPA catch-all — must come AFTER all /api routes so refreshing /chat or /admin
// always returns index.html instead of 404
if (fs.existsSync(frontendDist)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
