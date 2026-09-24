import React, { useState, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  BarChart3,
  LineChart,
  PieChart,
  AreaChart,
  Layers,
  Sparkles,
  Download,
  Filter,
  RefreshCw,
  TrendingUp,
  Percent,
  Sliders,
  Maximize2,
} from 'lucide-react';
import {
  DatasetColumn,
  ChartType,
  ChartConfig,
  DateGranularity,
  MeasureAgg,
  QueryRequest,
} from '../../types/analytics';
import { useAnalyticsStore } from '../../store/useAnalyticsStore';
import { useDatasetQuery } from '../../hooks/useDatasetAnalytics';
import { analyticsService } from '../../services/analyticsService';

interface ChartBuilderProps {
  datasetId: string;
  columns: DatasetColumn[];
  initialConfig?: Partial<ChartConfig>;
  onSaveWidget?: (config: ChartConfig) => void;
}

export const ChartBuilder: React.FC<ChartBuilderProps> = ({
  datasetId,
  columns,
  initialConfig,
  onSaveWidget,
}) => {
  const { filters, toggleCrossFilter } = useAnalyticsStore();
  const echartsRef = useRef<any>(null);

  // Derive initial fields
  const defaultDimension =
    columns.find((c) => c.role === 'dimension' || c.type === 'string')?.key || columns[0]?.key;
  const defaultMeasure =
    columns.find((c) => c.role === 'measure' || c.type === 'number')?.key || columns[1]?.key;

  const [type, setType] = useState<ChartType>(initialConfig?.type || 'bar');
  const [xAxisField, setXAxisField] = useState<string>(
    initialConfig?.xAxisField || defaultDimension || ''
  );
  const [granularity, setGranularity] = useState<DateGranularity>(
    initialConfig?.granularity || 'month'
  );
  const [measureField, setMeasureField] = useState<string>(
    initialConfig?.measureField || defaultMeasure || ''
  );
  const [agg, setAgg] = useState<MeasureAgg>(initialConfig?.agg || 'sum');
  const [splitByField, setSplitByField] = useState<string>(initialConfig?.splitByField || '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialConfig?.sortDir || 'desc');
  const [topN, setTopN] = useState<number>(initialConfig?.topN || 15);
  const [showShare, setShowShare] = useState<boolean>(initialConfig?.showShare || false);
  const [compare, setCompare] = useState<'previousPeriod' | 'sameLastYear' | undefined>(
    initialConfig?.compare
  );
  const [cumulative, setCumulative] = useState<boolean>(initialConfig?.cumulative || false);
  const [chartTitle, setChartTitle] = useState<string>(
    initialConfig?.title || 'Visualisation Analytique'
  );

  const selectedColX = columns.find((c) => c.key === xAxisField);
  const selectedColM = columns.find((c) => c.key === measureField);
  const isDateX = selectedColX?.type === 'date';

  // Construct query request from visual configuration
  const queryRequest = useMemo<QueryRequest>(() => {
    const groupByList: any[] = [];
    if (xAxisField) {
      groupByList.push({
        field: xAxisField,
        granularity: isDateX ? granularity : undefined,
      });
    }
    if (splitByField) {
      groupByList.push({ field: splitByField });
    }

    const measureAlias = `${agg}_${measureField}`;
    const measuresList: any[] = [
      {
        field: measureField || columns[0]?.key,
        agg,
        alias: measureAlias,
      },
    ];

    const sortList = [
      {
        field: measureAlias,
        dir: sortDir,
      },
    ];

    return {
      filters,
      groupBy: groupByList,
      measures: measuresList,
      sort: sortList,
      limit: topN > 0 ? topN : 50,
      compare,
      share: showShare ? { of: measureAlias } : undefined,
    };
  }, [
    filters,
    xAxisField,
    isDateX,
    granularity,
    splitByField,
    measureField,
    agg,
    sortDir,
    topN,
    compare,
    showShare,
    columns,
  ]);

  const { data: queryResult, isLoading, isError, refetch } = useDatasetQuery(
    datasetId,
    queryRequest
  );

  const rows = queryResult?.data || [];
  const measureAlias = `${agg}_${measureField}`;
  const shareAlias = `${measureAlias}_share`;

  // Build Apache ECharts Option
  const chartOption = useMemo(() => {
    if (!rows || rows.length === 0) return {};

    // Single KPI Card option
    if (type === 'kpi') {
      const total = rows.reduce((acc, r) => acc + (Number(r[measureAlias]) || 0), 0);
      return {
        title: {
          text: total.toLocaleString('fr-FR'),
          subtext: `${agg.toUpperCase()} de ${selectedColM?.label || measureField}`,
          left: 'center',
          top: 'middle',
          textStyle: { color: '#ffffff', fontSize: 36, fontWeight: 'bold' },
          subtextStyle: { color: '#94a3b8', fontSize: 14 },
        },
      };
    }

    // Pie / Donut chart
    if (type === 'pie' || type === 'donut') {
      const pieData = rows.map((r) => ({
        name: String(r[xAxisField] ?? 'N/A'),
        value: Number(r[measureAlias]) || 0,
      }));

      return {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)',
          backgroundColor: '#0c1424',
          borderColor: '#1e293b',
          textStyle: { color: '#f8fafc' },
        },
        legend: {
          orient: 'vertical',
          right: 10,
          top: 'center',
          textStyle: { color: '#94a3b8', fontSize: 11 },
        },
        series: [
          {
            name: selectedColM?.label || measureField,
            type: 'pie',
            radius: type === 'donut' ? ['45%', '75%'] : '70%',
            center: ['40%', '50%'],
            avoidLabelOverlap: true,
            itemStyle: {
              borderRadius: 6,
              borderColor: '#0b111e',
              borderWidth: 2,
            },
            label: {
              show: false,
            },
            data: pieData,
            color: [
              '#ff284d',
              '#3b82f6',
              '#10b981',
              '#f59e0b',
              '#8b5cf6',
              '#06b6d4',
              '#ec4899',
              '#64748b',
              '#14b8a6',
              '#f97316',
            ],
          },
        ],
      };
    }

    // Bar / Stacked / Line / Area / Scatter
    const xCategories = Array.from(new Set(rows.map((r) => String(r[xAxisField] ?? 'N/A'))));

    let series: any[] = [];

    if (splitByField) {
      // Multiple series split by dimension
      const splitCategories = Array.from(new Set(rows.map((r) => String(r[splitByField] ?? 'Autre'))));
      series = splitCategories.map((cat, idx) => {
        const catData = xCategories.map((xVal) => {
          const match = rows.find(
            (r) => String(r[xAxisField]) === xVal && String(r[splitByField]) === cat
          );
          return match ? Number(match[measureAlias]) || 0 : 0;
        });

        return {
          name: cat,
          type: type === 'stackedBar' ? 'bar' : type === 'area' ? 'line' : type,
          stack: type === 'stackedBar' || type === 'area' ? 'total' : undefined,
          areaStyle: type === 'area' ? { opacity: 0.3 } : undefined,
          smooth: type === 'line' || type === 'area',
          data: catData,
        };
      });
    } else {
      // Single series
      let yValues = rows.map((r) => Number(r[measureAlias]) || 0);

      // Cumulative calculation
      if (cumulative) {
        let acc = 0;
        yValues = yValues.map((v) => {
          acc += v;
          return acc;
        });
      }

      series.push({
        name: selectedColM?.label || measureField,
        type: type === 'area' ? 'line' : type === 'scatter' ? 'scatter' : type,
        areaStyle: type === 'area' ? { opacity: 0.3 } : undefined,
        smooth: type === 'line' || type === 'area',
        itemStyle: {
          color: '#ff284d',
          borderRadius: type === 'bar' ? [4, 4, 0, 0] : 0,
        },
        data: yValues,
      });
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0c1424',
        borderColor: '#1e293b',
        textStyle: { color: '#f8fafc' },
        axisPointer: { type: 'shadow' },
      },
      grid: {
        top: 40,
        right: 20,
        bottom: 50,
        left: 55,
        containLabel: true,
      },
      legend: splitByField
        ? {
            textStyle: { color: '#94a3b8', fontSize: 11 },
            top: 0,
          }
        : undefined,
      xAxis: {
        type: 'category',
        data: xCategories,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: {
          color: '#94a3b8',
          rotate: xCategories.length > 8 ? 35 : 0,
          interval: 0,
        },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#334155' } },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8' },
      },
      series,
    };
  }, [rows, type, xAxisField, measureAlias, selectedColM, splitByField, cumulative]);

  // Cross-filtering click event on chart elements
  const onChartClick = (params: any) => {
    if (params && params.name && xAxisField) {
      toggleCrossFilter(xAxisField, params.name);
    }
  };

  const handleDownloadImage = () => {
    if (echartsRef.current) {
      const echartInstance = echartsRef.current.getEchartsInstance();
      const base64 = echartInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#0b111e',
      });
      const a = document.createElement('a');
      a.href = base64;
      a.download = `${chartTitle || 'graphique'}.png`;
      a.click();
    }
  };

  return (
    <div className="bg-[#0b111e] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Top Header & Chart Type Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <input
            type="text"
            value={chartTitle}
            onChange={(e) => setChartTitle(e.target.value)}
            className="text-lg font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-[#ff284d] focus:outline-none px-1"
          />
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 px-1">
            <span>{rows.length} groupes agrégés</span>
            {queryResult?.meta && (
              <>
                <span>•</span>
                <span>{queryResult.meta.executionTimeMs} ms</span>
              </>
            )}
          </div>
        </div>

        {/* Chart Type Icon Bar */}
        <div className="flex flex-wrap items-center gap-1 bg-[#131b2e] p-1 rounded-xl border border-slate-700/80">
          <button
            type="button"
            onClick={() => setType('bar')}
            className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
              type === 'bar' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Histogramme"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setType('stackedBar')}
            className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
              type === 'stackedBar'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Barres empilées"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setType('line')}
            className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
              type === 'line' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Courbe temporelle"
          >
            <LineChart className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setType('area')}
            className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
              type === 'area' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Aires"
          >
            <AreaChart className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setType('pie')}
            className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
              type === 'pie' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Camembert"
          >
            <PieChart className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setType('donut')}
            className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
              type === 'donut' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Donut"
          >
            <span className="font-mono text-xs font-bold">🍩</span>
          </button>
          <button
            type="button"
            onClick={() => setType('kpi')}
            className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
              type === 'kpi' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
            title="Carte KPI"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visual Configuration Controls Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#0d1424] p-3.5 rounded-xl border border-slate-800">
        {/* X-Axis Dimension */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Dimension (Axe X)
          </label>
          <select
            value={xAxisField}
            onChange={(e) => setXAxisField(e.target.value)}
            className="w-full bg-[#131b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
          >
            {columns.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label} ({c.type})
              </option>
            ))}
          </select>
        </div>

        {/* Date Granularity (if date selected) or Split by */}
        {isDateX ? (
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Granularité Date
            </label>
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as DateGranularity)}
              className="w-full bg-[#131b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="year">Année</option>
              <option value="quarter">Trimestre</option>
              <option value="month">Mois</option>
              <option value="week">Semaine</option>
              <option value="day">Jour</option>
            </select>
          </div>
        ) : (
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Découpage par série
            </label>
            <select
              value={splitByField}
              onChange={(e) => setSplitByField(e.target.value)}
              className="w-full bg-[#131b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="">(Aucun découpage)</option>
              {columns
                .filter((c) => c.key !== xAxisField && (c.type === 'string' || c.type === 'boolean'))
                .map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Measure Column */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Mesure (Métrique)
          </label>
          <select
            value={measureField}
            onChange={(e) => setMeasureField(e.target.value)}
            className="w-full bg-[#131b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
          >
            {columns.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label} ({c.type})
              </option>
            ))}
          </select>
        </div>

        {/* Aggregation Function */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Agrégation
          </label>
          <select
            value={agg}
            onChange={(e) => setAgg(e.target.value as MeasureAgg)}
            className="w-full bg-[#131b2e] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
          >
            <option value="sum">Somme (SUM)</option>
            <option value="avg">Moyenne (AVG)</option>
            <option value="min">Minimum (MIN)</option>
            <option value="max">Maximum (MAX)</option>
            <option value="count">Nombre (COUNT)</option>
            <option value="countDistinct">Valeurs uniques (COUNT DISTINCT)</option>
          </select>
        </div>
      </div>

      {/* Secondary Options: Top N, Market Share, Cumulative, Download Image */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex flex-wrap items-center gap-3">
          {/* Top N */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Afficher :</span>
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="bg-[#131b2e] border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={15}>Top 15</option>
              <option value={25}>Top 25</option>
              <option value={50}>Top 50</option>
            </select>
          </div>

          {/* Share % toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showShare}
              onChange={(e) => setShowShare(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-[#ff284d] w-3.5 h-3.5"
            />
            <Percent className="w-3.5 h-3.5 text-amber-400" />
            <span>Part de marché (%)</span>
          </label>

          {/* Cumulative toggle */}
          {(type === 'line' || type === 'area' || type === 'bar') && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cumulative}
                onChange={(e) => setCumulative(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-[#ff284d] w-3.5 h-3.5"
              />
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              <span>Cumulatif</span>
            </label>
          )}

          {/* Compare toggle */}
          {isDateX && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={compare === 'previousPeriod'}
                onChange={(e) => setCompare(e.target.checked ? 'previousPeriod' : undefined)}
                className="rounded border-slate-700 bg-slate-800 text-[#ff284d] w-3.5 h-3.5"
              />
              <span>Variation vs P-1</span>
            </label>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Export image */}
          <button
            type="button"
            onClick={handleDownloadImage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Image PNG</span>
          </button>

          {onSaveWidget && (
            <button
              type="button"
              onClick={() =>
                onSaveWidget({
                  id: `widget_${Date.now()}`,
                  title: chartTitle,
                  type,
                  xAxisField,
                  granularity: isDateX ? granularity : undefined,
                  measureField,
                  agg,
                  splitByField: splitByField || undefined,
                  sortField: measureAlias,
                  sortDir,
                  topN,
                  showShare,
                  compare,
                  cumulative,
                })
              }
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
            >
              <span>+ Ajouter au Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="min-h-[380px] w-full relative flex items-center justify-center bg-[#070b14]/60 rounded-xl border border-slate-800/80 p-2">
        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-[#ff284d]" />
            <span>Calcul de la requête en cours...</span>
          </div>
        ) : isError ? (
          <div className="text-center text-xs text-red-400">
            Erreur lors de la génération du graphique. Vérifiez vos filtres ou la connexion base de données.
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center text-xs text-slate-500 italic">
            Aucune donnée pour les critères et filtres sélectionnés.
          </div>
        ) : (
          <ReactECharts
            ref={echartsRef}
            option={chartOption}
            style={{ height: '380px', width: '100%' }}
            onEvents={{ click: onChartClick }}
          />
        )}
      </div>

      <div className="text-[11px] text-slate-500 flex items-center justify-between">
        <span>💡 Astuce : Cliquez sur une barre ou une portion du graphique pour filtrer instantanément (Cross-filtering).</span>
      </div>
    </div>
  );
};
