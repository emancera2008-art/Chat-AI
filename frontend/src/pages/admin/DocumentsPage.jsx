import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { Upload, Trash2, ToggleLeft, ToggleRight, FileText, File, AlertCircle, CheckCircle } from 'lucide-react';

const FILE_ICONS = { '.pdf': '📄', '.docx': '📝', '.doc': '📝', '.txt': '📃', '.csv': '📊', '.md': '📃' };

function Toast({ msg, type }) {
  return (
    <div className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-50 ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
    </div>
  );
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState(null);
  const [name, setName] = useState('');
  const fileRef = useRef();

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    const { data } = await api.get('/documents');
    setDocs(data);
  }

  useEffect(() => { load(); }, []);

  async function upload(file) {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    try {
      await api.post('/documents', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast('Document uploaded and indexed!');
      setName('');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function toggleDoc(id) {
    await api.patch(`/documents/${id}/toggle`);
    load();
  }

  async function deleteDoc(id) {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    await api.delete(`/documents/${id}`);
    showToast('Document removed');
    load();
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  return (
    <div className="p-8">
      {toast && <Toast {...toast} />}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-500 mt-1">Upload dealership documents to enhance AI responses</p>
      </div>

      {/* Upload area */}
      <div className="card mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Upload Document</h2>
        <p className="text-sm text-gray-500 mb-4">Supported: PDF, DOCX, DOC, TXT, CSV, MD · Max 10 MB</p>

        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Document Name (optional)</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="input-field max-w-sm"
            placeholder="e.g. Q1 2025 Pricing Sheet"
          />
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
          }`}
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">{uploading ? 'Uploading & indexing…' : 'Drop file here or click to browse'}</p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt,.csv,.md"
            className="hidden"
            onChange={e => upload(e.target.files[0])}
          />
        </div>
      </div>

      {/* Document list */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">Uploaded Documents ({docs.length})</h2>
        {docs.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map(doc => (
              <div key={doc.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${doc.active ? 'border-gray-100 bg-gray-50' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
                <span className="text-2xl">{FILE_ICONS[doc.file_type] || '📄'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400">
                    {doc.original_name} · Uploaded by {doc.uploaded_by_name} · {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${doc.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                  {doc.active ? 'Active' : 'Disabled'}
                </span>
                <button onClick={() => toggleDoc(doc.id)} className={`flex-shrink-0 transition-colors ${doc.active ? 'text-green-500 hover:text-gray-400' : 'text-gray-400 hover:text-green-500'}`} title={doc.active ? 'Disable' : 'Enable'}>
                  {doc.active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
                <button onClick={() => deleteDoc(doc.id)} className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
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
