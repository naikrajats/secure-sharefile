import React, { useState } from 'react';
import { ArrowRight, Link2, X } from 'lucide-react';

const tokenPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function extractShareToken(value) {
  const input = value.trim();
  if (tokenPattern.test(input)) return input;

  let url;
  try {
    url = new URL(input, window.location.origin);
  } catch {
    return null;
  }

  const pathMatch = url.pathname.match(/\/share\/([^/]+)/);
  const hashPathMatch = url.hash.match(/(?:^|\/)share\/([^/&?#]+)/);
  const hashQuery = new URLSearchParams(url.hash.slice(1));
  const token = pathMatch?.[1] || url.searchParams.get('share') || hashPathMatch?.[1] || hashQuery.get('share');

  if (!token) return null;
  let decodedToken;
  try {
    decodedToken = decodeURIComponent(token);
  } catch {
    return null;
  }
  return tokenPattern.test(decodedToken) ? decodedToken : null;
}

export default function OpenShareLinkModal({ onClose, onOpen }) {
  const [link, setLink] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    const token = extractShareToken(link);
    if (!token) {
      setError('Paste a valid SecureDrive share URL or signed token.');
      return;
    }
    onOpen(token);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="open-share-link-title"
        className="relative w-full max-w-lg glass-panel p-6 rounded-2xl border border-cyan-500/25 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <h2 id="open-share-link-title" className="text-base font-bold text-white">Open a shared document</h2>
            <p className="text-xs text-slate-400">Paste its SecureDrive link or signed token.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label htmlFor="shared-document-link" className="block text-xs font-medium text-slate-300">
            Shared link
          </label>
          <input
            id="shared-document-link"
            type="text"
            value={link}
            onChange={(event) => {
              setLink(event.target.value);
              setError(null);
            }}
            placeholder="https://example.com/share/..."
            autoFocus
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
          {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
          <button
            type="submit"
            disabled={!link.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs disabled:opacity-50"
          >
            <span>Find document</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </section>
    </div>
  );
}