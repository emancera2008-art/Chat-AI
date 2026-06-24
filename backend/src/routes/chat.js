import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { getRelevantContext, getExcludedWords, filterExcludedContent } from '../services/ragService.js';

const router = Router();
// defaultHeaders instructs Anthropic's API not to use requests for training.
// Per Anthropic's API terms, API data is not used for training by default,
// but this header makes the intent explicit and enforceable.
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  defaultHeaders: {
    'anthropic-training': 'deny',
  },
});

const SYSTEM_PROMPT = `You are DealerAI, a knowledgeable and friendly assistant for an automotive dealership's Sales and BDC (Business Development Center) teams. You have broad knowledge of vehicles, automotive industry practices, financing, sales techniques, and customer service.

YOUR BEHAVIOR:
- Answer questions using your full knowledge of the automotive industry — you are not limited to the documents below.
- When dealership-specific documents are provided, prioritize that information for details like specific pricing, inventory, promotions, or internal policies.
- For general automotive questions (vehicle comparisons, financing concepts, sales tips, industry terms, etc.), answer confidently from your training knowledge.
- If a question involves specific dealership pricing or inventory NOT covered in the documents, be transparent: note that the specific figure isn't in the current documents and suggest they verify with a manager, but still provide helpful general context.
- Be professional, warm, and concise — you're helping a sales team serve customers well.
- Do not speak negatively about competitor brands.
- If a situation clearly requires a manager (e.g., complaint escalation, special pricing authority), say so.

{CONTEXT_SECTION}`;

router.get('/conversations', authenticate, (req, res) => {
  const db = getDb();
  const convos = db.prepare(`
    SELECT id, title, created_at, updated_at FROM conversations
    WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50
  `).all(req.user.id);
  res.json(convos);
});

router.post('/conversations', authenticate, (req, res) => {
  const db = getDb();
  const result = db.prepare('INSERT INTO conversations (user_id, title) VALUES (?, ?)').run(req.user.id, 'New Conversation');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/conversations/:id/messages', authenticate, (req, res) => {
  const db = getDb();
  const convo = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });

  const messages = db.prepare('SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json({ conversation: convo, messages });
});

router.post('/conversations/:id/messages', authenticate, async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Message content required' });

  const db = getDb();
  const convo = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });

  const excludedWords = getExcludedWords();
  const userContent = filterExcludedContent(content, excludedWords);

  // Save user message
  db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').run(req.params.id, 'user', content);

  // Update conversation title from first message
  if (convo.title === 'New Conversation') {
    const title = content.slice(0, 60) + (content.length > 60 ? '...' : '');
    db.prepare('UPDATE conversations SET title = ?, updated_at = datetime("now") WHERE id = ?').run(title, req.params.id);
  } else {
    db.prepare('UPDATE conversations SET updated_at = datetime("now") WHERE id = ?').run(req.params.id);
  }

  // Get conversation history
  const history = db.prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(req.params.id);

  // Get relevant context from documents
  const context = getRelevantContext(userContent);

  const contextSection = context
    ? `DEALERSHIP DOCUMENTS (use these for dealership-specific details):\n${context}`
    : `DEALERSHIP DOCUMENTS: No documents have been uploaded yet. Use your general automotive knowledge to help, and note when dealership-specific details would need to be verified internally.`;

  const systemPrompt = SYSTEM_PROMPT.replace('{CONTEXT_SECTION}', contextSection);

  try {
    const messages = history.map(m => ({ role: m.role, content: m.content }));

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    let assistantContent = response.content[0].text;
    assistantContent = filterExcludedContent(assistantContent, excludedWords);

    db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').run(req.params.id, 'assistant', assistantContent);

    res.json({ message: assistantContent });
  } catch (err) {
    console.error('Claude API error:', err.message);
    res.status(500).json({ error: 'Failed to get AI response. Please try again.' });
  }
});

router.delete('/conversations/:id', authenticate, (req, res) => {
  const db = getDb();
  const convo = db.prepare('SELECT id FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });

  db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(req.params.id);
  db.prepare('DELETE FROM conversations WHERE id = ?').run(req.params.id);
  res.json({ message: 'Conversation deleted' });
});

export default router;
