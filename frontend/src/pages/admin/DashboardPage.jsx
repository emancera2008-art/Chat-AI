import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Users, FileText, Ban, MessageSquare, Shield, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

function StatCard({ label, value, icon: Icon, color, to }) {
  return (
    <Link to={to} className="card hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState({});

  useEffect(() => {
    async function load() {
      const [users, docs, exclusions] = await Promise.all([
        api.get('/users'),
        api.get('/documents'),
        api.get('/exclusions'),
      ]);
      setStats({
        users: users.data.filter(u => u.active).length,
        documents: docs.data.filter(d => d.active).length,
        exclusions: exclusions.data.length,
      });
    }
    load();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your DealerAI system</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <StatCard label="Active Users" value={stats.users} icon={Users} color="bg-blue-500" to="/admin/users" />
        <StatCard label="Active Documents" value={stats.documents} icon={FileText} color="bg-green-500" to="/admin/documents" />
        <StatCard label="Excluded Words" value={stats.exclusions} icon={Ban} color="bg-orange-500" to="/admin/exclusions" />
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="font-semibold text-gray-800">Privacy & Data</h2>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold mt-0.5">✓</span>
              All data stored locally on your server
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold mt-0.5">✓</span>
              Conversations never used to train AI models
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold mt-0.5">✓</span>
              Training opt-out header sent on every request
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold mt-0.5">✓</span>
              No third-party data sharing
            </li>
          </ul>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="font-semibold text-gray-800">Quick Actions</h2>
          </div>
          <div className="space-y-2">
            <Link to="/admin/users" className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:underline">→ Add a new team member</Link>
            <Link to="/admin/documents" className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:underline">→ Upload a dealership document</Link>
            <Link to="/admin/exclusions" className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:underline">→ Manage word exclusions</Link>
            <Link to="/chat" className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:underline">→ Open the chat assistant</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
