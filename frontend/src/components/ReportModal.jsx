import React, { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { api } from '../api';

export default function ReportModal({ files, onClose }) {
  const [targetType, setTargetType] = useState('file');
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('Abuse or suspicious activity');
  const [details, setDetails] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.submitReport(targetType, targetId, reason, details);
      onClose(true);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/80 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="report-modal-title" className="relative my-auto w-full max-w-lg rounded-2xl border border-amber-500/25 bg-[#0d1423] p-6 shadow-2xl">
        <button type="button" onClick={() => onClose(false)} aria-label="Close report form" className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
          <X className="h-5 w-5" />
        </button>
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-amber-300"><Flag className="h-5 w-5" /></div>
          <div>
            <h2 id="report-modal-title" className="text-base font-bold text-white">Report content or account</h2>
            <p className="text-xs text-slate-400">Reports are reviewed by a SecureDrive administrator.</p>
          </div>
        </div>
        {error && <p role="alert" className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="report-target-type" className="mb-1.5 block text-xs font-medium text-slate-300">Report type</label>
            <select id="report-target-type" value={targetType} onChange={(event) => { setTargetType(event.target.value); setTargetId(''); }} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white">
              <option value="file">File</option>
              <option value="user">User account</option>
            </select>
          </div>
          <div>
            <label htmlFor="report-target" className="mb-1.5 block text-xs font-medium text-slate-300">{targetType === 'file' ? 'Select file' : 'Account email'}</label>
            {targetType === 'file' ? (
              <select id="report-target" required value={targetId} onChange={(event) => setTargetId(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white">
                <option value="">Choose a file</option>
                {files.map((file) => <option key={file.id} value={file.id}>{file.original_name}</option>)}
              </select>
            ) : (
              <input id="report-target" type="email" required value={targetId} onChange={(event) => setTargetId(event.target.value)} placeholder="person@example.com" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500" />
            )}
          </div>
          <div>
            <label htmlFor="report-reason" className="mb-1.5 block text-xs font-medium text-slate-300">Reason</label>
            <select id="report-reason" value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white">
              <option>Abuse or suspicious activity</option>
              <option>Malware or unsafe content</option>
              <option>Copyright or privacy concern</option>
              <option>Harassment or impersonation</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="report-details" className="mb-1.5 block text-xs font-medium text-slate-300">Details</label>
            <textarea id="report-details" rows="3" maxLength={2000} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Add context to help the review." className="w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500" />
          </div>
          <button disabled={saving || !targetId} className="w-full rounded-xl bg-amber-500/15 px-4 py-2.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 disabled:opacity-50">
            {saving ? 'Submitting report...' : 'Submit report'}
          </button>
        </form>
      </section>
    </div>
  );
}
