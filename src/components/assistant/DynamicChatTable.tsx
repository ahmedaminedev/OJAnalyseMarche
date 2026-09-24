import React, { useState, useMemo } from 'react';
import { Table, ArrowUpDown, Download, Copy, Check, Search } from 'lucide-react';
import { AssistantTableData } from '../../services/assistantService';

interface DynamicChatTableProps {
  data: AssistantTableData;
}

export const DynamicChatTable: React.FC<DynamicChatTableProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColIdx, setSortColIdx] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [copied, setCopied] = useState(false);

  const headers = data.headers || [];
  const rawRows = data.rows || [];

  const handleSort = (colIdx: number) => {
    if (sortColIdx === colIdx) {
      setSortAsc(!sortAsc);
    } else {
      setSortColIdx(colIdx);
      setSortAsc(true);
    }
  };

  const filteredAndSortedRows = useMemo(() => {
    let rows = [...rawRows];

    // Filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter((row) =>
        row.some((cell) => String(cell || '').toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortColIdx !== null) {
      rows.sort((a, b) => {
        const valA = a[sortColIdx] ?? '';
        const valB = b[sortColIdx] ?? '';

        // Clean numbers
        const numA = Number(String(valA).replace(/\s+/g, '').replace(',', '.').replace('%', ''));
        const numB = Number(String(valB).replace(/\s+/g, '').replace(',', '.').replace('%', ''));

        if (!isNaN(numA) && !isNaN(numB)) {
          return sortAsc ? numA - numB : numB - numA;
        }

        return sortAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return rows;
  }, [rawRows, searchTerm, sortColIdx, sortAsc]);

  const handleCopyClipboard = () => {
    const tsv = [
      headers.join('\t'),
      ...filteredAndSortedRows.map((r) => r.join('\t')),
    ].join('\n');

    navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(';'),
        ...filteredAndSortedRows.map((r) =>
          r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')
        ),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${data.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mt-3.5 pt-3.5 border-t border-slate-700/60 bg-[#080e1a] rounded-xl p-4 border border-slate-800 shadow-inner">
      {/* Table Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Table className="w-3.5 h-3.5 text-cyan-400" />
            <span>{data.title}</span>
          </div>
          {data.description && (
            <p className="text-[11px] text-slate-400 mt-0.5">{data.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Filter */}
          {rawRows.length > 4 && (
            <div className="relative">
              <input
                type="text"
                placeholder="Filtrer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg pl-6 pr-2 py-1 text-[11px] text-white focus:outline-none focus:border-red-500 w-28 sm:w-32"
              />
              <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1.5" />
            </div>
          )}

          {/* Action buttons */}
          <button
            type="button"
            onClick={handleCopyClipboard}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Copier le tableau (presse-papier)"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Exporter en CSV"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto max-h-72 rounded-lg border border-slate-800/80 scrollbar-thin">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#0b1424] text-slate-300 font-semibold sticky top-0 z-10 border-b border-slate-800">
            <tr>
              {headers.map((h, idx) => (
                <th
                  key={idx}
                  onClick={() => handleSort(idx)}
                  className="px-3 py-2 cursor-pointer hover:bg-slate-800/50 transition-colors select-none text-[11px] whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{h}</span>
                    <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850/60 font-mono text-[11px]">
            {filteredAndSortedRows.length > 0 ? (
              filteredAndSortedRows.map((row, rIdx) => {
                const isHighlight = row.some((cell) =>
                  /omoda|jaecoo/i.test(String(cell))
                );

                return (
                  <tr
                    key={rIdx}
                    className={`transition-colors hover:bg-slate-800/40 ${
                      isHighlight
                        ? 'bg-red-950/20 text-red-300 font-bold'
                        : rIdx % 2 === 0
                        ? 'bg-slate-900/30 text-slate-200'
                        : 'bg-transparent text-slate-300'
                    }`}
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={headers.length || 1}
                  className="px-3 py-4 text-center text-slate-500"
                >
                  Aucune ligne correspondante.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      {data.totalSummary && (
        <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>{data.totalSummary}</span>
          <span className="text-[10px] text-slate-500">
            {filteredAndSortedRows.length} ligne(s)
          </span>
        </div>
      )}
    </div>
  );
};
