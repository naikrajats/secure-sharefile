import React, { useEffect, useState } from 'react';
import { Activity, FileText, Flag, RefreshCw, ShieldAlert, ShieldCheck, Users } from 'lucide-react';
import { api } from '../api';

const views = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'sharing', label: 'Sharing & Logs', icon: FileText },
  { id: 'reports', label: 'Reports', icon: Flag },
];

const formatDate = (value) => new Date(value).toLocaleString();
const statusClass = (status) => status === 'ACTIVE' || status === 'SUCCESS'
  ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
  : status === 'OPEN'
    ? 'text-amber-300 bg-amber-500/10 border-amber-500/20'
    : 'text-slate-300 bg-slate-800 border-slate-700';

export default function AdminCenter() {
  const [view, setView] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [shares, setShares] = useState([]);
  const [activity, setActivity] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, userData, shareData, activityData, reportData] = await Promise.all([
        api.getAdminSummary(),
        api.getAdminUsers(),
        api.getAdminShares(),
        api.getAdminActivity(),
        api.getAdminReports(),
      ]);
      setSummary(summaryData);
      setUsers(userData);
      setShares(shareData);
      setActivity(activityData);
      setReports(reportData);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const runAction = async (id, action, successMessage) => {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(successMessage);
      await refresh();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyId(null);
    }
  };

  const stats = summary ? [
    { label: 'Registered users', value: summary.users_total, detail: `${summary.users_active} active` },
    { label: 'Stored files', value: summary.files_total, detail: `${(summary.storage_bytes / 1024 / 1024).toFixed(1)} MB used` },
    { label: 'Share links', value: summary.shares_total, detail: `${summary.shares_active} active` },
    { label: 'Successful downloads', value: summary.successful_downloads, detail: `${summary.open_reports} open reports` },
  ] : [];

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-white"><ShieldCheck className="h-5 w-5 text-cyan-300" />Admin Console</h1>
          <p className="mt-1 text-xs text-slate-400">Account controls, sharing activity, reports, and system usage.</p>
        </div>
        <button type="button" onClick={refresh} disabled={loading} title="Refresh admin data" className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:text-cyan-300 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-slate-800" aria-label="Admin sections">
        {views.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setView(id)} className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold ${view === id ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-white'}`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </nav>

      {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">{notice}</p>}

      {view === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs text-slate-400">{stat.label}</p>
                <p className="mt-2 text-2xl font-bold text-white">{loading && !summary ? '—' : stat.value}</p>
                <p className="mt-1 text-[11px] text-slate-500">{stat.detail}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Latest access activity</h2>
            <ActivityTable events={activity.slice(0, 8)} />
          </div>
        </div>
      )}

      {view === 'users' && (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-900 text-slate-400"><tr><th className="p-3">Account</th><th className="p-3">Joined</th><th className="p-3">Files</th><th className="p-3">Links</th><th className="p-3">State</th><th className="p-3 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="p-3"><p className="font-semibold text-slate-200">{user.full_name}{user.is_admin && <span className="ml-2 text-cyan-300">Admin</span>}</p><p className="mt-1 text-slate-500">{user.email}</p></td>
                  <td className="p-3 text-slate-400">{formatDate(user.created_at)}</td><td className="p-3 text-slate-300">{user.files_count}</td><td className="p-3 text-slate-300">{user.shares_count}</td>
                  <td className="p-3"><span className={`rounded-full border px-2 py-1 text-[10px] ${user.is_active ? statusClass('ACTIVE') : statusClass('INACTIVE')}`}>{user.is_active ? 'ACTIVE' : 'DEACTIVATED'}</span></td>
                  <td className="p-3 text-right"><button type="button" disabled={busyId === user.id || (user.is_admin && users.filter((item) => item.is_admin && item.is_active).length <= 1)} onClick={() => runAction(user.id, () => api.setUserActive(user.id, !user.is_active), user.is_active ? 'Account deactivated.' : 'Account activated.')} className="rounded-lg border border-slate-700 px-2.5 py-1.5 font-medium text-slate-200 hover:border-cyan-500/50 disabled:opacity-40">{user.is_active ? 'Deactivate' : 'Activate'}</button></td>
                </tr>
              ))}
              {!loading && users.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-500">No accounts found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {view === 'sharing' && (
        <div className="space-y-5">
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="bg-slate-900 text-slate-400"><tr><th className="p-3">File</th><th className="p-3">Owner</th><th className="p-3">State</th><th className="p-3">Views / Downloads</th><th className="p-3">Created</th><th className="p-3 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                {shares.map((share) => <tr key={share.id}>
                  <td className="p-3 font-medium text-slate-200">{share.file_name}</td><td className="p-3 text-slate-400">{share.owner_email}</td>
                  <td className="p-3"><span className={`rounded-full border px-2 py-1 text-[10px] ${statusClass(share.status)}`}>{share.status}</span></td>
                  <td className="p-3 text-slate-300">{share.viewers_count} / {share.download_count}{share.max_downloads > 0 ? ` of ${share.max_downloads}` : ''}</td><td className="p-3 text-slate-400">{formatDate(share.created_at)}</td>
                  <td className="p-3 text-right"><button type="button" disabled={busyId === share.id || share.is_revoked} onClick={() => runAction(share.id, () => api.adminRevokeShare(share.id), 'Share link revoked.')} className="rounded-lg border border-rose-500/30 px-2.5 py-1.5 font-medium text-rose-300 hover:bg-rose-500/10 disabled:opacity-40">Revoke</button></td>
                </tr>)}
                {!loading && shares.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-500">No share links found.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"><h2 className="mb-3 text-sm font-semibold text-white">Access logs</h2><ActivityTable events={activity} /></div>
        </div>
      )}

      {view === 'reports' && (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-900 text-slate-400"><tr><th className="p-3">Target</th><th className="p-3">Reason / Details</th><th className="p-3">Reporter</th><th className="p-3">Status</th><th className="p-3">Reported</th><th className="p-3 text-right">Review</th></tr></thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40">
              {reports.map((report) => <tr key={report.id}>
                <td className="p-3"><span className="mr-1 rounded bg-slate-800 px-1.5 py-1 text-[10px] uppercase text-slate-400">{report.target_type}</span><span className="text-slate-200">{report.target_label}</span></td>
                <td className="max-w-xs p-3"><p className="font-medium text-slate-200">{report.reason}</p>{report.details && <p className="mt-1 whitespace-pre-wrap text-slate-500">{report.details}</p>}</td>
                <td className="p-3 text-slate-400">{report.reporter_email}</td><td className="p-3"><span className={`rounded-full border px-2 py-1 text-[10px] ${statusClass(report.status)}`}>{report.status}</span></td><td className="p-3 text-slate-400">{formatDate(report.created_at)}</td>
                <td className="p-3 text-right">{report.status === 'OPEN' ? <div className="flex justify-end gap-1"><button type="button" disabled={busyId === report.id} onClick={() => runAction(report.id, () => api.resolveReport(report.id, 'REVIEWED', 'Reviewed by admin'), 'Report marked reviewed.')} className="rounded-lg border border-cyan-500/30 px-2 py-1.5 text-cyan-300 disabled:opacity-40">Review</button><button type="button" disabled={busyId === report.id} onClick={() => runAction(report.id, () => api.resolveReport(report.id, 'DISMISSED'), 'Report dismissed.')} className="rounded-lg border border-slate-700 px-2 py-1.5 text-slate-300 disabled:opacity-40">Dismiss</button></div> : <span className="text-slate-500">Closed</span>}</td>
              </tr>)}
              {!loading && reports.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-500">No reported files or accounts.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ActivityTable({ events }) {
  if (!events.length) return <p className="py-6 text-center text-xs text-slate-500">No access events recorded.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left text-xs">
        <thead className="text-slate-500"><tr><th className="p-2">Time</th><th className="p-2">File</th><th className="p-2">Owner</th><th className="p-2">Client IP</th><th className="p-2">Event</th></tr></thead>
        <tbody className="divide-y divide-slate-800/70">
          {events.map((event) => <tr key={event.id}><td className="p-2 text-slate-400">{formatDate(event.accessed_at)}</td><td className="p-2 text-slate-200">{event.file_name}</td><td className="p-2 text-slate-400">{event.owner_email}</td><td className="p-2 font-mono text-slate-400">{event.ip_address || 'Unknown'}</td><td className="p-2"><span className={`rounded-full border px-2 py-1 text-[10px] ${statusClass(event.status)}`}>{event.status}</span></td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
