import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { UserPlus, Pencil, UserX, UserCheck, X, Save, AlertCircle } from 'lucide-react';

const DEPARTMENTS = ['Sales', 'BDC', 'Finance', 'Service', 'Management', 'Parts', 'Other'];

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function UserForm({ initial = {}, onSave, onClose, isEdit }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    email: initial.email || '',
    password: '',
    role: initial.role || 'user',
    department: initial.department || 'Sales',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form };
      if (isEdit && !payload.password) delete payload.password;
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  }

  const field = (label, key, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="input-field"
        placeholder={placeholder}
        required={!isEdit || key !== 'password'}
      />
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {field('Full Name', 'name', 'text', 'Jane Smith')}
      {field('Email Address', 'email', 'email', 'jane@dealership.com')}
      {field(isEdit ? 'New Password (leave blank to keep)' : 'Password', 'password', 'password', '••••••••')}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input-field">
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="input-field">
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save User'}
        </button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null); // null | 'add' | user object
  const [search, setSearch] = useState('');

  async function load() {
    const { data } = await api.get('/users');
    setUsers(data);
  }

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.department?.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleActive(u) {
    await api.put(`/users/${u.id}`, { ...u, active: !u.active });
    load();
  }

  const roleBadge = role => role === 'admin'
    ? 'bg-purple-100 text-purple-700'
    : 'bg-blue-100 text-blue-700';

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">Manage team member access</p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="card">
        <input
          type="search"
          placeholder="Search users…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field mb-4 max-w-sm"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-2 font-semibold text-gray-500">Name</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-500">Email</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-500">Department</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-500">Role</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-500">Status</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className={`${!u.active ? 'opacity-50' : ''}`}>
                  <td className="py-3 px-2 font-medium text-gray-900">{u.name}</td>
                  <td className="py-3 px-2 text-gray-600">{u.email}</td>
                  <td className="py-3 px-2 text-gray-600">{u.department}</td>
                  <td className="py-3 px-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${roleBadge(u.role)}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setModal(u)} className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleActive(u)} className="text-gray-400 hover:text-orange-600 transition-colors" title={u.active ? 'Deactivate' : 'Activate'}>
                        {u.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'add' && (
        <Modal title="Add New User" onClose={() => setModal(null)}>
          <UserForm
            onSave={async payload => { await api.post('/users', payload); load(); }}
            onClose={() => setModal(null)}
            isEdit={false}
          />
        </Modal>
      )}

      {modal && modal !== 'add' && (
        <Modal title="Edit User" onClose={() => setModal(null)}>
          <UserForm
            initial={modal}
            onSave={async payload => { await api.put(`/users/${modal.id}`, payload); load(); }}
            onClose={() => setModal(null)}
            isEdit
          />
        </Modal>
      )}
    </div>
  );
}
