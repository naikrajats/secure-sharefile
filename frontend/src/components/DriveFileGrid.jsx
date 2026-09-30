import React from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  FileCode, 
  FileImage, 
  File, 
  Share2, 
  Download, 
  Eye, 
  Trash2, 
  Flame, 
  MoreVertical 
} from 'lucide-react';
import { api } from '../api';

export default function DriveFileGrid({ files, onShare, onPreview, onDelete }) {
  const getFileIcon = (file) => {
    const name = file.original_name.toLowerCase();
    if (name.endsWith('.pdf')) {
      return { icon: FileText, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
    }
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
      return { icon: FileSpreadsheet, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    }
    if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.svg')) {
      return { icon: FileImage, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
    }
    if (name.endsWith('.js') || name.endsWith('.py') || name.endsWith('.json') || name.endsWith('.html')) {
      return { icon: FileCode, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    }
    return { icon: File, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
  };

  if (!files || files.length === 0) {
    return (
      <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto mb-3">
          <FileText className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Your Secure Drive is Empty</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Upload any file to store it safely in the vault and generate time-expiring signed links.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {files.map((file) => {
        const fileStyle = getFileIcon(file);
        const IconComponent = fileStyle.icon;

        return (
          <div
            key={file.id}
            onDoubleClick={() => onPreview(file)}
            className="group glass-panel hover:bg-slate-900/90 rounded-2xl p-4 border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-200 shadow-md hover:shadow-cyan-500/5 flex flex-col justify-between cursor-pointer"
          >
            {/* Top row: Icon + Type badge + Active Shares */}
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl border ${fileStyle.color}`}>
                <IconComponent className="w-5 h-5" />
              </div>

              {file.active_shares_count > 0 ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{file.active_shares_count} Active Link{file.active_shares_count > 1 ? 's' : ''}</span>
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">Unshared</span>
              )}
            </div>

            {/* File info */}
            <div className="mb-4">
              <h4 
                title={file.original_name}
                className="text-xs font-bold text-slate-200 group-hover:text-white truncate"
              >
                {file.original_name}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                {(file.size_bytes / 1024).toFixed(1)} KB • {new Date(file.created_at).toLocaleDateString()}
              </p>
            </div>

            {/* Action buttons (Google Drive style quick bar) */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(file);
                }}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-semibold border border-cyan-500/20 transition-colors"
                title="Create Expiring Share Link"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>

              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(file);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Preview in Browser"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    api.downloadDirectFile(file.id, file.original_name);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(file.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                  title="Delete File"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
