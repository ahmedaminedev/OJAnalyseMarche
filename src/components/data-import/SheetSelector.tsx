import React from 'react';
import { Layers, ChevronDown, TableProperties } from 'lucide-react';
import { SheetAnalysis } from '../../types/import';

interface SheetSelectorProps {
  sheetNames: string[];
  activeSheetName: string;
  sheets: Record<string, SheetAnalysis>;
  onSelectSheet: (sheetName: string) => void;
}

export const SheetSelector: React.FC<SheetSelectorProps> = ({
  sheetNames,
  activeSheetName,
  sheets,
  onSelectSheet,
}) => {
  if (sheetNames.length <= 1) {
    const singleSheet = sheets[activeSheetName];
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
        <TableProperties className="w-3.5 h-3.5 text-[#ff284d]" />
        <span className="text-slate-400">Feuille :</span>
        <span className="font-semibold text-white">{activeSheetName}</span>
        {singleSheet && (
          <span className="text-slate-500 text-[11px]">
            ({singleSheet.rowCount.toLocaleString('fr-FR')} lignes, {singleSheet.columnCount} col.)
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
        <Layers className="w-4 h-4 text-[#ff284d]" />
        <span>Feuille :</span>
      </div>

      <div className="relative inline-block">
        <select
          value={activeSheetName}
          onChange={(e) => onSelectSheet(e.target.value)}
          className="appearance-none bg-slate-900 hover:bg-slate-850 text-white text-xs font-semibold rounded-xl pl-3 pr-8 py-2 border border-slate-700/80 focus:outline-none focus:border-[#ff284d] focus:ring-1 focus:ring-[#ff284d] cursor-pointer shadow-sm transition-colors"
          aria-label="Sélectionner la feuille de calcul"
        >
          {sheetNames.map((name) => {
            const sheet = sheets[name];
            const rows = sheet ? sheet.rowCount.toLocaleString('fr-FR') : '0';
            const cols = sheet ? sheet.columnCount : '0';
            return (
              <option key={name} value={name} className="bg-slate-900 text-slate-100">
                {name} — ({rows} lignes, {cols} col.)
              </option>
            );
          })}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
};
