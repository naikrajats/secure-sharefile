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
  Trash2 
} from 'lucide-react';
import { api } from '../api';

export default function DriveFileList({ files, onShare, onPreview, onDelete }) {
  const getFileIcon = (file) => {
    const name = file.original_name.toLowerCase();
    if (name.endsWith('.pdf')) return <FileText className="w-4 h-4 text-rose-400" />;
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')) return <FileImage className="w-4 h-4 text-purple-400" />;
    if (name.endsWith('.js') || name.endsWith('.py') || name.endsWith('.json')) return <FileCode className="w-4 h-4 text-amber-400" />;
    return <File className="w-4 h-4 text-cyan-400" />;
  };

  if (!files || files.length === 0) {
    return (
      <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center">
        <h3 className="text-base font-bold text-white mb-1">No Files Found</h3>
        <p className="text-xs text-slate-400">Upload a file or clear search filters to view files.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold">
            <tr>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Active Expiring Links</th>
              <th className="py-3 px-4">File Size</th>
              <th className="py-3 px-4">Uploaded Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {files.map((file) => (
              <tr 
                key={file.id}
                onDoubleClick={() => onPreview(file)}
                className="hover:bg-slate-900/60 transition-colors group cursor-pointer"
              >
                {/* Name */}
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2.5">
                    {getFileIcon(file)}
                    <span className="font-semibold text-slate-200 group-hover:text-cyan-300 truncate max-w-xs sm:max-w-md">
                      {file.original_name}
                    </span>
                  </div>
                </td>

                {/* Active Links */}
                <td className="py-3 px-4">
                  {file.active_shares_count > 0 ? (
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{file.active_shares_count} Active Link{file.active_shares_count > 1 ? 's' : ''}</span>
                    </span>
                  ) : (
                    <span className="text-slate-500">None</span>
                  )}
                </td>

                {/* Size */}
                <td className="py-3 px-4 text-slate-400 font-mono">
                  {(file.size_bytes / 1024).toFixed(1)} KB
                </td>

                {/* Date */}
                <td className="py-3 px-4 text-slate-400">
                  {new Date(file.created_at).toLocaleDateString()}
                </td>

                {/* Actions */}
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onShare(file);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-semibold border border-cyan-500/20 transition-colors"
                      title="Share Expiring Link"
                    >
                      Share
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview(file);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        api.downloadDirectFile(file.id, file.original_name);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(file.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
