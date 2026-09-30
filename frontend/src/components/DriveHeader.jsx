import React from 'react';
import { Search, LayoutGrid, List, RefreshCw, X, Filter } from 'lucide-react';

export default function DriveHeader({ 
  searchQuery, 
  onSearchChange, 
  viewMode, 
  onViewModeChange,
  fileTypeFilter,
  onFileTypeFilterChange,
  onRefresh,
  loading,
  totalFiles
}) {
  return (
    <div className="space-y-4">
      {/* Search Bar + View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Search Input (Google Drive Style) */}
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files in Secure Drive..."
            className="w-full bg-slate-900/90 border border-slate-700/80 hover:border-slate-600 focus:border-cyan-500 rounded-2xl pl-10 pr-9 py-2 text-xs text-white placeholder-slate-400 focus:outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* View Toggle & Refresh */}
        <div className="flex items-center space-x-2 self-end sm:self-center">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            title="Refresh Drive"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <div className="flex p-1 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => onViewModeChange("grid")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-slate-800 text-cyan-400 shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-slate-800 text-cyan-400 shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 flex items-center space-x-1 mr-1">
          <Filter className="w-3 h-3" />
          <span>Filter:</span>
        </span>

        {[
          { id: "all", label: `All Files (${totalFiles})` },
          { id: "pdf", label: "PDF Documents" },
          { id: "sheet", label: "Spreadsheets" },
          { id: "image", label: "Images" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => onFileTypeFilterChange(f.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
              fileTypeFilter === f.id
                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
