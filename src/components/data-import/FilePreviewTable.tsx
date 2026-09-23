import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Hash,
  Calendar,
  Type,
  ToggleLeft,
  HelpCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
} from 'lucide-react';
import { ColumnInfo, DetectedDataType } from '../../types/import';
import { sanitizeCellValue } from '../../utils/security';

interface FilePreviewTableProps {
  columns: ColumnInfo[];
  data: Record<string, unknown>[];
  totalFileRows: number;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  key: string;
  direction: SortDirection;
}

const TYPE_ICONS: Record<DetectedDataType, React.ComponentType<{ className?: string }>> = {
  text: Type,
  number: Hash,
  date: Calendar,
  boolean: ToggleLeft,
  empty: HelpCircle,
  mixed: HelpCircle,
};

const TYPE_COLORS: Record<DetectedDataType, string> = {
  text: 'text-blue-400 bg-blue-950/40 border-blue-800/50',
  number: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
  date: 'text-purple-400 bg-purple-950/40 border-purple-800/50',
  boolean: 'text-amber-400 bg-amber-950/40 border-amber-800/50',
  empty: 'text-slate-400 bg-slate-800 border-slate-700',
  mixed: 'text-rose-400 bg-rose-950/40 border-rose-800/50',
};

export const FilePreviewTable: React.FC<FilePreviewTableProps> = ({
  columns: columnDefs,
  data,
  totalFileRows,
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });
  const [globalFilter, setGlobalFilter] = useState('');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');

  // Reset current page when filter, sort or page size changes
  useEffect(() => {
    setCurrentPage(1);
    setJumpPageInput('1');
  }, [globalFilter, pageSize]);

  // Keep jump input in sync with currentPage
  useEffect(() => {
    setJumpPageInput(String(currentPage));
  }, [currentPage]);

  // Sorting Handler
  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return { key: '', direction: null };
    });
  };

  // Filtered & Sorted Data
  const processedData = useMemo(() => {
    let list = [...data];

    // 1. Global Search Filter across all fields
    if (globalFilter.trim()) {
      const q = globalFilter.toLowerCase().trim();
      list = list.filter((row) =>
        Object.entries(row).some(([k, v]) => {
          if (k.startsWith('__')) return false;
          if (v === null || v === undefined) return false;
          return String(v).toLowerCase().includes(q);
        })
      );
    }

    // 2. Column Sorting
    if (sortConfig.key && sortConfig.direction) {
      const { key, direction } = sortConfig;
      list.sort((a, b) => {
        const valA = a[key];
        const valB = b[key];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return direction === 'asc' ? valA - valB : valB - valA;
        }

        if (valA instanceof Date && valB instanceof Date) {
          return direction === 'asc'
            ? valA.getTime() - valB.getTime()
            : valB.getTime() - valA.getTime();
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return direction === 'asc' ? -1 : 1;
        if (strA > strB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [data, globalFilter, sortConfig]);

  // Pagination Calculations
  const effectivePageSize = pageSize === -1 ? Math.max(1, processedData.length) : pageSize;
  const totalPages = Math.max(1, Math.ceil(processedData.length / effectivePageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * effectivePageSize;
  const endIndex = Math.min(processedData.length, startIndex + effectivePageSize);
  const displayedRows = useMemo(() => {
    return processedData.slice(startIndex, endIndex);
  }, [processedData, startIndex, endIndex]);

  // Page Jump Form Submit
  const handlePageJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpPageInput, 10);
    if (!isNaN(parsed)) {
      const target = Math.min(Math.max(1, parsed), totalPages);
      setCurrentPage(target);
    }
  };

  // Generate pagination items with smart ellipsis
  const paginationItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const items: (number | string)[] = [];
    items.push(1);

    if (safeCurrentPage > 3) {
      items.push('...');
    }

    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(totalPages - 1, safeCurrentPage + 1);

    for (let i = start; i <= end; i++) {
      items.push(i);
    }

    if (safeCurrentPage < totalPages - 2) {
      items.push('...');
    }

    items.push(totalPages);
    return items;
  }, [totalPages, safeCurrentPage]);

  return (
    <div className="rounded-2xl border border-slate-800/90 bg-[#0d1627] shadow-xl overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-800/90 bg-slate-900/70 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Rechercher dans toutes les colonnes..."
            className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff284d] focus:ring-1 focus:ring-[#ff284d] transition-colors"
          />
          {globalFilter && (
            <button
              type="button"
              onClick={() => setGlobalFilter('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              title="Effacer la recherche"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Display controls and quick pager */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          {/* Page Size Selector */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Lignes par page :</span>
            <span className="sm:hidden">Lignes :</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-[#ff284d] cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={-1}>Toutes ({processedData.length})</option>
            </select>
          </div>

          {/* Quick Pagination Counter */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 bg-slate-950/90 px-3 py-1 rounded-xl border border-slate-800">
            <span className="text-white font-bold">
              {processedData.length > 0 ? `${startIndex + 1}-${endIndex}` : '0'}
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{processedData.length.toLocaleString('fr-FR')}</span>
            <span className="text-slate-500 hidden sm:inline">lignes</span>

            {/* Mini Previous/Next buttons */}
            <div className="flex items-center ml-2 border-l border-slate-800 pl-2 gap-0.5">
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                title="Page précédente"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] text-slate-400 px-1 font-sans">
                {safeCurrentPage}/{totalPages}
              </span>
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                title="Page suivante"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Scroll Container with Sticky Header */}
      <div className="relative overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead className="sticky top-0 z-20 bg-[#070b14] shadow-md border-b border-slate-800">
            <tr>
              {/* Row index header */}
              <th className="px-3 py-3 w-14 text-center text-[11px] font-mono text-slate-500 border-r border-slate-800/80 bg-[#0d1627]/95 backdrop-blur-sm">
                #
              </th>

              {/* Dynamic column headers */}
              {columnDefs.map((col) => {
                const Icon = TYPE_ICONS[col.detectedType] || HelpCircle;
                const typeBadge = TYPE_COLORS[col.detectedType];
                const isCurrentSort = sortConfig.key === col.key;

                return (
                  <th
                    key={col.key}
                    className="px-3.5 py-3 border-r border-slate-800/80 last:border-r-0 bg-[#0d1627]/95 backdrop-blur-sm"
                  >
                    <div className="flex flex-col gap-1 select-none">
                      <div
                        onClick={() => handleSort(col.key)}
                        className="flex items-center justify-between gap-2 cursor-pointer group hover:text-white transition-colors"
                        title={`Trier par ${col.name}`}
                      >
                        <span
                          className={`font-semibold text-xs truncate max-w-[180px] ${
                            col.isUnnamed ? 'italic text-amber-300/90' : 'text-slate-200'
                          }`}
                        >
                          {col.name}
                        </span>

                        <span className="text-slate-500 group-hover:text-slate-300">
                          {isCurrentSort && sortConfig.direction === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#ff284d]" />
                          ) : isCurrentSort && sortConfig.direction === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 text-[#ff284d]" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </span>
                      </div>

                      {/* Column detected type badge */}
                      <div className="flex items-center gap-1">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border flex items-center gap-0.5 ${typeBadge}`}
                        >
                          <Icon className="w-2.5 h-2.5" />
                          <span>{col.detectedType}</span>
                        </span>
                        {col.emptyCount > 0 && (
                          <span
                            className="text-[9px] text-amber-400 font-mono"
                            title={`${col.emptyCount} cellules vides`}
                          >
                            ({col.emptyCount}ø)
                          </span>
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 bg-[#0a101d]/50">
            {displayedRows.length > 0 ? (
              displayedRows.map((row, idx) => {
                const rowIndex = (row.__rowIndex as number) || startIndex + idx + 1;
                return (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      idx % 2 === 0 ? 'bg-[#0d1627]/30' : 'bg-transparent'
                    }`}
                  >
                    {/* Row Index */}
                    <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-500 border-r border-slate-800/50 bg-slate-950/20">
                      {rowIndex}
                    </td>

                    {/* Data Cells */}
                    {columnDefs.map((col) => {
                      const val = row[col.key];

                      if (val === null || val === undefined || String(val).trim() === '') {
                        return (
                          <td
                            key={col.key}
                            className="px-3.5 py-2.5 text-xs border-r border-slate-800/50 last:border-r-0 whitespace-nowrap bg-amber-950/10"
                          >
                            <span className="text-amber-500/50 italic text-[11px] font-mono">
                              — vide —
                            </span>
                          </td>
                        );
                      }

                      const displayStr = sanitizeCellValue(val);

                      // String that is a number stored as text
                      if (col.detectedType === 'number' && typeof val === 'string') {
                        return (
                          <td
                            key={col.key}
                            className="px-3.5 py-2.5 text-xs border-r border-slate-800/50 last:border-r-0 whitespace-nowrap"
                          >
                            <span
                              className="font-mono text-xs text-amber-300 block text-right"
                              title="Nombre stocké sous forme de texte"
                            >
                              {displayStr}*
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={col.key}
                          className="px-3.5 py-2.5 text-xs border-r border-slate-800/50 last:border-r-0 whitespace-nowrap"
                        >
                          <span
                            className="text-xs text-slate-200 block truncate max-w-[240px]"
                            title={displayStr}
                          >
                            {displayStr}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={columnDefs.length + 1}
                  className="px-6 py-12 text-center text-sm text-slate-400 italic"
                >
                  Aucune donnée ne correspond aux critères de recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Professional Pagination Bar */}
      <div className="p-3 border-t border-slate-800/90 bg-[#090e18] flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Left: Detailed Row Count Information */}
        <div className="text-slate-400 flex items-center gap-2">
          <span>
            Affichage des lignes <strong className="text-white font-mono">{processedData.length > 0 ? startIndex + 1 : 0}</strong> à{' '}
            <strong className="text-white font-mono">{endIndex}</strong> sur{' '}
            <strong className="text-emerald-400 font-mono">{processedData.length.toLocaleString('fr-FR')}</strong>{' '}
            lignes
          </span>
          {processedData.length !== data.length && (
            <span className="text-[11px] text-amber-400/90 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-md">
              (filtré sur {data.length.toLocaleString('fr-FR')} total)
            </span>
          )}
        </div>

        {/* Center: Interactive Page Buttons */}
        <div className="flex items-center gap-1">
          {/* First Page button */}
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage(1)}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Première page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Previous Page button */}
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Page précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page numbers with ellipsis */}
          <div className="flex items-center gap-1 px-1">
            {paginationItems.map((item, idx) => {
              if (item === '...') {
                return (
                  <span key={`dots-${idx}`} className="px-1 text-slate-600 font-mono select-none">
                    ...
                  </span>
                );
              }

              const pageNum = item as number;
              const isActive = pageNum === safeCurrentPage;

              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold font-mono transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-red-600 to-[#ff284d] text-white shadow-md shadow-red-600/30'
                      : 'bg-slate-900/80 border border-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Page button */}
          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Page suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last Page button */}
          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => setCurrentPage(totalPages)}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Dernière page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Direct Page Jump Form */}
        <form onSubmit={handlePageJumpSubmit} className="flex items-center gap-1.5 text-slate-400">
          <span className="text-[11px]">Aller à :</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpPageInput}
            onChange={(e) => setJumpPageInput(e.target.value)}
            className="w-14 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700/80 text-center text-xs text-white font-mono focus:outline-none focus:border-[#ff284d]"
          />
          <span className="text-[11px] text-slate-500 font-mono">/ {totalPages}</span>
          <button
            type="submit"
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            OK
          </button>
        </form>
      </div>

      {/* Table Footer with Info note & Legend */}
      <div className="p-3 border-t border-slate-800/90 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {totalFileRows.toLocaleString('fr-FR')} lignes totales détectées dans le fichier Excel
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-amber-500/40 border border-amber-500/80 inline-block" />
            <span>Cellule vide</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-amber-400 font-mono font-bold">*</span>
            <span>Nombre en format texte</span>
          </span>
        </div>
      </div>
    </div>
  );
};
