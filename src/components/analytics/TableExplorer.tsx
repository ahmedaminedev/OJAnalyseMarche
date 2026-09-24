import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Eye,
  EyeOff,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns,
  RefreshCw,
  Search,
} from 'lucide-react';
import { DatasetColumn } from '../../types/analytics';
import { analyticsService } from '../../services/analyticsService';
import { useAnalyticsStore } from '../../store/useAnalyticsStore';
import { useQuery } from '@tanstack/react-query';

interface TableExplorerProps {
  datasetId: string;
  columns: DatasetColumn[];
  totalRowsCount: number;
}

export const TableExplorer: React.FC<TableExplorerProps> = ({
  datasetId,
  columns,
  totalRowsCount,
}) => {
  const { filters, addCondition } = useAnalyticsStore();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [activeHeaderFilterCol, setActiveHeaderFilterCol] = useState<string | null>(null);
  const [headerFilterValue, setHeaderFilterValue] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const sortField = sorting[0]?.id;
  const sortDir = sorting[0]?.desc ? 'desc' : 'asc';

  // Fetch paginated rows from backend
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tableRows', datasetId, page, pageSize, sortField, sortDir],
    queryFn: ({ signal }) =>
      analyticsService.fetchRows(datasetId, page, pageSize, sortField, sortDir, signal),
    staleTime: 10000,
  });

  const rowsData = data?.rows || [];
  const totalCount = data?.total || totalRowsCount;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Build TanStack Table column definitions dynamically from dataset.columns
  const tableColumns = useMemo<ColumnDef<any>[]>(() => {
    return columns.map((col) => ({
      id: col.key,
      accessorFn: (row) => row[col.key],
      header: col.label,
      cell: (info) => {
        const val = info.getValue();
        if (val === null || val === undefined || val === '') {
          return <span className="text-slate-500 italic text-[11px]">-</span>;
        }
        if (col.type === 'number') {
          return (
            <span className="font-mono text-slate-100">
              {Number(val).toLocaleString('fr-FR')}
            </span>
          );
        }
        if (col.type === 'date') {
          return (
            <span className="text-slate-300 text-[11px]">
              {new Date(val as string | number).toLocaleDateString('fr-FR')}
            </span>
          );
        }
        if (col.type === 'boolean') {
          return val ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
              OUI
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
              NON
            </span>
          );
        }
        return <span className="text-slate-200 truncate">{String(val)}</span>;
      },
    }));
  }, [columns]);

  const table = useReactTable({
    data: rowsData,
    columns: tableColumns,
    state: {
      sorting,
      columnVisibility,
    },
    manualSorting: true,
    manualPagination: true,
    pageCount: totalPages,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleExport = async (format: 'xlsx' | 'csv') => {
    try {
      setIsExporting(true);
      await analyticsService.exportQuery(datasetId, { filters }, format);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’export');
    } finally {
      setIsExporting(false);
    }
  };

  const handleHeaderFilterApply = (colKey: string, op: 'contains' | 'eq') => {
    if (headerFilterValue.trim()) {
      addCondition({ field: colKey, op, value: headerFilterValue.trim() });
    }
    setActiveHeaderFilterCol(null);
    setHeaderFilterValue('');
  };

  return (
    <div className="bg-[#0b111e] border border-slate-800/80 rounded-2xl shadow-xl flex flex-col overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-[#0d1424]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white">Explorateur Tabulaire</span>
          <span className="text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 font-mono">
            {totalCount.toLocaleString('fr-FR')} lignes
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Columns Visibility Dropdown */}
          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <Columns className="w-3.5 h-3.5 text-blue-400" />
              <span>Colonnes ({table.getVisibleLeafColumns().length}/{columns.length})</span>
            </button>

            <div className="hidden group-hover:block absolute right-0 top-full mt-1.5 w-56 bg-[#0c1424] border border-slate-700 rounded-xl shadow-2xl p-2 z-50 max-h-64 overflow-y-auto space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">
                Afficher / Masquer
              </div>
              {table.getAllLeafColumns().map((column) => {
                const isVisible = column.getIsVisible();
                const colMeta = columns.find((c) => c.key === column.id);
                return (
                  <label
                    key={column.id}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-800/60 text-xs text-slate-200 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={column.getToggleVisibilityHandler()}
                      className="rounded border-slate-700 bg-slate-800 text-[#ff284d] w-3.5 h-3.5"
                    />
                    <span className="truncate">{colMeta?.label || column.id}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Export Buttons */}
          <button
            type="button"
            disabled={isExporting}
            onClick={() => handleExport('xlsx')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            <span>CSV</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => refetch()}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-white transition-colors"
            title="Rafraîchir les données"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-[#0c1424] border-b border-slate-800 z-10 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const colKey = header.id;
                  const colMeta = columns.find((c) => c.key === colKey);
                  const isSorted = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      className="px-3.5 py-3 font-bold text-slate-300 border-r border-slate-800/80 select-none whitespace-nowrap bg-[#0c1424] relative group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Sort click */}
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1.5 hover:text-white transition-colors text-left flex-1"
                        >
                          <span className="font-semibold text-xs">{colMeta?.label || colKey}</span>
                          {isSorted === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#ff284d]" />
                          ) : isSorted === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 text-[#ff284d]" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600 group-hover:text-slate-400 opacity-60" />
                          )}
                        </button>

                        {/* Excel Header Filter Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveHeaderFilterCol(
                              activeHeaderFilterCol === colKey ? null : colKey
                            );
                          }}
                          className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-white"
                          title="Filtrer cette colonne"
                        >
                          <Filter className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Header Filter Popup */}
                      {activeHeaderFilterCol === colKey && (
                        <div
                          className="absolute left-0 top-full mt-1 w-64 bg-[#0d1627] border border-slate-700 rounded-xl shadow-2xl p-3 z-30 space-y-2.5 font-normal"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-[11px] font-bold text-slate-300">
                            Filtrer {colMeta?.label}
                          </div>
                          <input
                            type="text"
                            placeholder="Valeur..."
                            value={headerFilterValue}
                            onChange={(e) => setHeaderFilterValue(e.target.value)}
                            className="w-full bg-[#131b2e] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                          />
                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setActiveHeaderFilterCol(null)}
                              className="px-2 py-1 text-[11px] text-slate-400 hover:text-white"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={() => handleHeaderFilterApply(colKey, 'contains')}
                              className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-semibold"
                            >
                              Appliquer
                            </button>
                          </div>
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-slate-800/50">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#ff284d]" />
                    <span>Chargement des lignes...</span>
                  </div>
                </td>
              </tr>
            ) : rowsData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-slate-500 italic">
                  Aucune ligne trouvée.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    idx % 2 === 0 ? 'bg-[#090e1a]' : 'bg-[#070b14]'
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-3.5 py-2.5 border-r border-slate-800/40 whitespace-nowrap text-xs"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="p-3.5 border-t border-slate-800/80 bg-[#0d1424] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span>Lignes par page :</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-[#131b2e] border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span>
            Page <strong className="text-white">{page}</strong> sur{' '}
            <strong className="text-white">{totalPages}</strong>
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(1)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
              title="Première page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
              title="Page précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
              title="Page suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
              title="Dernière page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
