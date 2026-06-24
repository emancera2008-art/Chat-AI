import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Ban, Plus, Trash2, AlertCircle, Info } from 'lucide-react';

export default function ExclusionsPage() {
  const [words, setWords] = useState([]);
  const [word, setWord] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  async function load() {
    const { data } = await api.get('/exclusions');
    setWords(data);
  }

  useEffect(() => { load(); }, []);

  async function addWord(e) {
    e.preventDefault();
    if (!word.trim()) return;
    setError('');
    setAdding(true);
    try {
      await api.post('/exclusions', { word: word.trim(), reason: reason.trim() || null });
      setWord('');
      setReason('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add exclusion');
    } finally {
      setAdding(false);
    }
  }

  async function removeWord(id) {
    await api.delete(`/exclusions/${id}`);
    load();
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Word Exclusions</h1>
        <p className="text-gray-500 mt-1">Block specific words or phrases from AI responses</p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-800">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p>
          Excluded words will be automatically redacted from both user messages and AI responses.
          Use this to block competitor names, sensitive pricing terms, inappropriate language, or any words your team should not use.
        </p>
      </div>

      {/* Add form */}
      <div className="card mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Add Exclusion</h2>
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-4">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        <form onSubmit={addWord} className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={word}
            onChange={e => setWord(e.target.value)}
            placeholder="Word or phrase to exclude"
            className="input-field flex-1 min-w-40"
            required
          />
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="input-field flex-1 min-w-40"
          />
          <button type="submit" disabled={adding || !word.trim()} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" /> {adding ? 'Adding…' : 'Add Exclusion'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">Current Exclusions ({words.length})</h2>
        {words.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Ban className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No exclusions added yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {words.map(w => (
              <div key={w.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <Ban className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-mono font-semibold text-gray-900 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded text-sm">{w.word}</span>
                  {w.reason && <span className="text-xs text-gray-400 ml-3">{w.reason}</span>}
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0">
                  Added by {w.added_by_name} · {new Date(w.created_at).toLocaleDateString()}
                </div>
                <button onClick={() => removeWord(w.id)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0" title="Remove">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
