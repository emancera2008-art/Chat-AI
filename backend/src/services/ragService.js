import { getDb } from '../db/database.js';

export function getRelevantContext(query, maxChars = 6000) {
  const db = getDb();
  const docs = db.prepare('SELECT name, content FROM documents WHERE active = 1').all();
  if (docs.length === 0) return '';

  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  const scored = docs.map(doc => {
    const contentLower = doc.content.toLowerCase();
    let score = 0;
    for (const word of queryWords) {
      const matches = (contentLower.match(new RegExp(word, 'g')) || []).length;
      score += matches;
    }
    return { ...doc, score };
  }).filter(d => d.score > 0).sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    // Return first portion of all docs if no keyword match
    const allContent = docs.map(d => `[${d.name}]\n${d.content.slice(0, 1000)}`).join('\n\n');
    return allContent.slice(0, maxChars);
  }

  let context = '';
  for (const doc of scored) {
    const snippet = extractRelevantSnippet(doc.content, queryWords, 1500);
    const entry = `[${doc.name}]\n${snippet}\n\n`;
    if (context.length + entry.length > maxChars) break;
    context += entry;
  }

  return context;
}

function extractRelevantSnippet(content, keywords, maxLength) {
  const lower = content.toLowerCase();
  let bestIdx = 0;
  let bestScore = 0;

  const windowSize = 500;
  for (let i = 0; i < lower.length - windowSize; i += 100) {
    const window = lower.slice(i, i + windowSize);
    let score = 0;
    for (const kw of keywords) score += (window.match(new RegExp(kw, 'g')) || []).length;
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }

  const start = Math.max(0, bestIdx - 100);
  return content.slice(start, start + maxLength);
}

export function getExcludedWords() {
  const db = getDb();
  return db.prepare('SELECT word FROM excluded_words').all().map(r => r.word.toLowerCase());
}

export function filterExcludedContent(text, excludedWords) {
  if (excludedWords.length === 0) return text;
  let filtered = text;
  for (const word of excludedWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filtered = filtered.replace(regex, '[redacted]');
  }
  return filtered;
}
