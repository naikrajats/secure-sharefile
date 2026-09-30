import React, { useState } from 'react';
import { Mail, MessageCircle } from 'lucide-react';

export default function ShareDeliveryOptions({ fileName, shareUrl, passphrase = '' }) {
  const [includePassphrase, setIncludePassphrase] = useState(false);
  const message = [
    `A file was shared with you: ${fileName}`,
    shareUrl,
    includePassphrase && passphrase ? `Passphrase: ${passphrase}` : null,
  ].filter(Boolean).join('\n\n');
  const encodedMessage = encodeURIComponent(message);
  const subject = encodeURIComponent(`SecureDrive shared file: ${fileName}`);

  return (
    <div className="mb-4 space-y-2">
      {passphrase.trim() && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-left">
          <input
            id="include-share-passphrase"
            type="checkbox"
            checked={includePassphrase}
            onChange={(event) => setIncludePassphrase(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-amber-500"
          />
          <div>
            <label htmlFor="include-share-passphrase" className="cursor-pointer text-xs font-medium text-amber-200">
              Include passphrase in the message
            </label>
            <p className="mt-0.5 text-[10px] text-slate-400">
              For better security, send the passphrase separately.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <a
          href={`mailto:?subject=${subject}&body=${encodedMessage}`}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
        >
          <Mail className="h-4 w-4" />
          <span>Email</span>
        </a>
        <a
          href={`https://wa.me/?text=${encodedMessage}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-emerald-500/40 hover:text-emerald-300"
        >
          <MessageCircle className="h-4 w-4" />
          <span>WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
