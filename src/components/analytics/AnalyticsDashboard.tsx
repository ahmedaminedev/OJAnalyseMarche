import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Plus,
  Trash2,
  Download,
  Share2,
  Sliders,
  TrendingUp,
  Layers,
  Sparkles,
  BarChart3,
  Percent,
} from 'lucide-react';
import {
  DatasetColumn,
  ChartConfig,
  DashboardWidget,
  QueryResult,
} from '../../types/analytics';
import { useAnalyticsStore } from '../../store/useAnalyticsStore';
import { useDatasetQuery } from '../../hooks/useDatasetAnalytics';
import { analyticsService } from '../../services/analyticsService';

interface AnalyticsDashboardProps {
  datasetId: string;
  columns: DatasetColumn[];
  totalRows: number;
}

const DASHBOARD_STORAGE_KEY = 'oj_dashboard_widgets_config';

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  datasetId,
  columns,
  totalRows,
}) => {
  const { filters, toggleCrossFilter } = useAnalyticsStore();

  const dimensionCols = columns.filter((c) => c.role === 'dimension' || c.type === 'string');
  const measureCols = columns.filter((c) => c.role === 'measure' || c.type === 'number');
  const dateCols = columns.filter((c) => c.role === 'date' || c.type === 'date');

  const primaryDim = dimensionCols[0]?.key || columns[0]?.key;
  const primaryMeasure = measureCols[0]?.key || columns[1]?.key;
  const dateDim = dateCols[0]?.key;

  // Initial default widgets
  const defaultWidgets: DashboardWidget[] = [
    {
      id: 'w_1',
      title: `Top 10 par ${dimensionCols[0]?.label || 'Dimension'}`,
      gridSpan: 'half',
      config: {
        id: 'cfg_1',
        title: `Top 10 par ${dimensionCols[0]?.label || 'Dimension'}`,
        type: 'bar',
        xAxisField: primaryDim,
        measureField: primaryMeasure,
        agg: 'sum',
        sortField: `sum_${primaryMeasure}`,
        sortDir: 'desc',
        topN: 10,
      },
    },
    {
      id: 'w_2',
      title: `Parts de Marché (${dimensionCols[0]?.label || 'Dimension'})`,
      gridSpan: 'half',
      config: {
        id: 'cfg_2',
        title: `Parts de Marché`,
        type: 'donut',
        xAxisField: primaryDim,
        measureField: primaryMeasure,
        agg: 'sum',
        sortField: `sum_${primaryMeasure}`,
        sortDir: 'desc',
        topN: 8,
        showShare: true,
      },
    },
    ...(dateDim
      ? [
          {
            id: 'w_3',
            title: `Évolution Temporelle des Volumes`,
            gridSpan: 'full' as const,
            config: {
              id: 'cfg_3',
              title: `Évolution Temporelle des Volumes`,
              type: 'area' as const,
              xAxisField: dateDim,
              granularity: 'month' as const,
              measureField: primaryMeasure,
              agg: 'sum' as const,
              sortField: `sum_${primaryMeasure}`,
              sortDir: 'asc' as const,
            },
          },
        ]
      : []),
  ];

  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    try {
      const saved = localStorage.getItem(`${DASHBOARD_STORAGE_KEY}_${datasetId}`);
      return saved ? JSON.parse(saved) : defaultWidgets;
    } catch {
      return defaultWidgets;
    }
  });

  // Persist widgets layout on change
  useEffect(() => {
    try {
      localStorage.setItem(`${DASHBOARD_STORAGE_KEY}_${datasetId}`, JSON.stringify(widgets));
    } catch {
      // ignore
    }
  }, [widgets, datasetId]);

  const removeWidget = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  };

  const toggleWidgetSpan = (id: string) => {
    setWidgets((prev) =>
      prev.map((w) => {
        if (w.id === id) {
          const nextSpan = w.gridSpan === 'half' ? 'full' : 'half';
          return { ...w, gridSpan: nextSpan };
        }
        return w;
      })
    );
  };

  // High-level KPI summary query
  const kpiQuery = useDatasetQuery(datasetId, {
    filters,
    measures: [
      { field: primaryMeasure || columns[0]?.key, agg: 'sum', alias: 'total_volume' },
      { field: primaryMeasure || columns[0]?.key, agg: 'avg', alias: 'avg_volume' },
      { field: primaryDim || columns[0]?.key, agg: 'countDistinct', alias: 'unique_entities' },
    ],
  });

  const kpiData = kpiQuery.data?.data?.[0] || {};
  const totalVolume = Number(kpiData.total_volume) || 0;
  const avgVolume = Number(kpiData.avg_volume) || 0;
  const uniqueEntities = Number(kpiData.unique_entities) || 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Volume */}
        <div className="bg-[#0b111e] border border-slate-800/80 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-600/10 text-[#ff284d] border border-red-500/20 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Total {measureCols[0]?.label || 'Volume'}
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {totalVolume.toLocaleString('fr-FR')}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Somme calculée sous filtres actifs
            </div>
          </div>
        </div>

        {/* Card 2: Average */}
        <div className="bg-[#0b111e] border border-slate-800/80 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 shrink-0">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Moyenne par ligne
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {avgVolume.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Moyenne arithmétique
            </div>
          </div>
        </div>

        {/* Card 3: Unique Dimensions */}
        <div className="bg-[#0b111e] border border-slate-800/80 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              {dimensionCols[0]?.label || 'Entités distinctes'}
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {uniqueEntities.toLocaleString('fr-FR')}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Entités uniques identifiées
            </div>
          </div>
        </div>

        {/* Card 4: Total records */}
        <div className="bg-[#0b111e] border border-slate-800/80 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-600/10 text-amber-400 border border-amber-500/20 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Enregistrements
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {totalRows.toLocaleString('fr-FR')}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Lignes physiques en base
            </div>
          </div>
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className={`transition-all ${widget.gridSpan === 'full' ? 'lg:col-span-2' : ''}`}
          >
            <DashboardWidgetItem
              widget={widget}
              datasetId={datasetId}
              columns={columns}
              onRemove={() => removeWidget(widget.id)}
              onToggleSpan={() => toggleWidgetSpan(widget.id)}
              onCrossFilter={toggleCrossFilter}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

interface DashboardWidgetItemProps {
  widget: DashboardWidget;
  datasetId: string;
  columns: DatasetColumn[];
  onRemove: () => void;
  onToggleSpan: () => void;
  onCrossFilter: (field: string, val: any) => void;
}

const DashboardWidgetItem: React.FC<DashboardWidgetItemProps> = ({
  widget,
  datasetId,
  columns,
  onRemove,
  onToggleSpan,
  onCrossFilter,
}) => {
  const { filters } = useAnalyticsStore();
  const cfg = widget.config;

  const measureAlias = `${cfg.agg}_${cfg.measureField}`;

  const queryRequest = {
    filters,
    groupBy: [
      {
        field: cfg.xAxisField || columns[0]?.key,
        granularity: cfg.granularity,
      },
    ],
    measures: [
      {
        field: cfg.measureField || columns[0]?.key,
        agg: cfg.agg,
        alias: measureAlias,
      },
    ],
    sort: [
      {
        field: measureAlias,
        dir: cfg.sortDir,
      },
    ],
    limit: cfg.topN || 15,
  };

  const { data, isLoading, isError } = useDatasetQuery(datasetId, queryRequest);
  const rows = data?.data || [];

  const chartOption = React.useMemo(() => {
    if (!rows || rows.length === 0) return {};

    if (cfg.type === 'donut' || cfg.type === 'pie') {
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
          right: 5,
          top: 'center',
          textStyle: { color: '#94a3b8', fontSize: 10 },
        },
        series: [
          {
            type: 'pie',
            radius: cfg.type === 'donut' ? ['45%', '70%'] : '65%',
            center: ['40%', '50%'],
            data: rows.map((r) => ({
              name: String(r[cfg.xAxisField || ''] ?? 'N/A'),
              value: Number(r[measureAlias]) || 0,
            })),
            color: ['#ff284d', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'],
          },
        ],
      };
    }

    const xVals = rows.map((r) => String(r[cfg.xAxisField || ''] ?? ''));
    const yVals = rows.map((r) => Number(r[measureAlias]) || 0);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0c1424',
        borderColor: '#1e293b',
        textStyle: { color: '#f8fafc' },
      },
      grid: { top: 20, right: 15, bottom: 40, left: 45, containLabel: true },
      xAxis: {
        type: 'category',
        data: xVals,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', rotate: xVals.length > 8 ? 30 : 0 },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#334155' } },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8' },
      },
      series: [
        {
          type: cfg.type === 'area' ? 'line' : cfg.type,
          areaStyle: cfg.type === 'area' ? { opacity: 0.3 } : undefined,
          smooth: cfg.type === 'line' || cfg.type === 'area',
          itemStyle: { color: '#ff284d', borderRadius: cfg.type === 'bar' ? [4, 4, 0, 0] : 0 },
          data: yVals,
        },
      ],
    };
  }, [rows, cfg, measureAlias]);

  return (
    <div className="bg-[#0b111e] border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-3">
      {/* Widget Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <h4 className="text-sm font-bold text-white truncate">{widget.title}</h4>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleSpan}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
            title="Agrandir / Réduire la largeur"
          >
            <span className="text-[10px] font-mono font-bold px-1 rounded bg-slate-800">
              {widget.gridSpan === 'full' ? '50%' : '100%'}
            </span>
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800"
            title="Supprimer ce graphique"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full flex items-center justify-center">
        {isLoading ? (
          <div className="text-xs text-slate-500">Chargement...</div>
        ) : rows.length === 0 ? (
          <div className="text-xs text-slate-500 italic">Aucune donnée sous ces filtres.</div>
        ) : (
          <ReactECharts
            option={chartOption}
            style={{ height: '100%', width: '100%' }}
            onEvents={{
              click: (params: any) => {
                if (params && params.name && cfg.xAxisField) {
                  onCrossFilter(cfg.xAxisField, params.name);
                }
              },
            }}
          />
        )}
      </div>
    </div>
  );
};
