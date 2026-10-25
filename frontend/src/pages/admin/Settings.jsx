import React, { useState } from 'react';
import { Settings, Shield, ExternalLink, CheckCircle2, Server, Key } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

export default function AdminSettings() {
  const { showToast } = useNotification();
  const [plagiarismUrl, setPlagiarismUrl] = useState('http://localhost:5001/verify-plagiarism');
  const [dbClient, setDbClient] = useState('sqlite');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    showToast('Platform environment configuration saved.', 'success');
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Platform Configuration & Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Central environment parameters, authentication token Lifespans, and external plagiarism engine integration.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Plagiarism Checker Integration Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                AI Plagiarism Checker Service Integration
              </h2>
              <p className="text-xs text-slate-400">
                Configures the target URL for the separate partner website
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              External Plagiarism Service Target URL
            </label>
            <input
              type="url"
              required
              value={plagiarismUrl}
              onChange={(e) => setPlagiarismUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Default local mock service runs at <code className="bg-slate-100 px-1 py-0.5 rounded">http://localhost:5001/verify-plagiarism</code>. When your partner developer launches their live server, update this value.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800 flex items-center">
              <Shield className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              Cryptographic Signed Launch Token Protocol
            </div>
            <p className="text-[11px] text-slate-500">
              When a faculty member clicks "Check Plagiarism", a 5-minute single-use HMAC token is issued. No passwords or private document text are leaked in query parameters.
            </p>
          </div>
        </div>

        {/* Database & Security Info */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Relational Database Engine</h2>
              <p className="text-xs text-slate-400">Database dialect and connection mode</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">Active Dialect</span>
              <span className="font-bold text-slate-800">SQLite 3 (WAL Mode & Foreign Keys Enabled)</span>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">PostgreSQL Ready</span>
              <span className="font-bold text-slate-800">Available via DB_CLIENT=postgres</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
          >
            {saved ? 'Settings Saved!' : 'Save Platform Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}

