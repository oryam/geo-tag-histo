import React, { useMemo, useState } from 'react';
import { BleLocationPoint } from '../types/ble';
import { formatTimestamp } from '../utils/geo';
import {
  Clock,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  Activity,
  ArrowRight,
  Layers,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface BleChronogramProps {
  allPoints: BleLocationPoint[];
  selectedPoint: BleLocationPoint | null;
  onSelectPoint: (point: BleLocationPoint) => void;
  intervalFilter: 'all' | 'over30' | 'over60';
  onIntervalFilterChange: (mode: 'all' | 'over30' | 'over60') => void;
}

export type IntervalCategory = 'under5_grouped' | 'normal' | 'over30' | 'over60';

export interface ChronoSlot {
  id: string;
  isGrouped: boolean;
  groupedCount: number;
  fromPoint: BleLocationPoint;
  toPoint: BleLocationPoint;
  deltaSeconds: number;
  deltaMinutes: number;
  category: IntervalCategory;
  isOver30Min: boolean;
  isOver60Min: boolean;
}

export const BleChronogram: React.FC<BleChronogramProps> = ({
  allPoints,
  selectedPoint,
  onSelectPoint,
  intervalFilter,
  onIntervalFilterChange,
}) => {
  // Default: merge intervals < 5 min as requested
  const [groupUnder5Min, setGroupUnder5Min] = useState<boolean>(true);
  const [hoveredSlot, setHoveredSlot] = useState<ChronoSlot | null>(null);
  // Toggle to show all items in the interruptions section without scrollbar
  const [showAllInterruptions, setShowAllInterruptions] = useState<boolean>(false);

  // 1. Raw chronological intervals (ordered chronologically asc)
  const rawIntervals = useMemo(() => {
    if (allPoints.length < 2) return [];

    const chrono = [...allPoints].sort((a, b) => a.device_timestamp - b.device_timestamp);
    const result: {
      id: string;
      fromPoint: BleLocationPoint;
      toPoint: BleLocationPoint;
      deltaSeconds: number;
      deltaMinutes: number;
      category: IntervalCategory;
      isOver30Min: boolean;
      isOver60Min: boolean;
    }[] = [];

    for (let i = 1; i < chrono.length; i++) {
      const prev = chrono[i - 1];
      const curr = chrono[i];
      const deltaSec = Math.max(0, curr.device_timestamp - prev.device_timestamp);
      const deltaMin = deltaSec / 60;

      let category: IntervalCategory = 'normal';
      if (deltaMin > 60) {
        category = 'over60';
      } else if (deltaMin > 30) {
        category = 'over30';
      } else if (deltaMin < 5) {
        category = 'under5_grouped';
      }

      result.push({
        id: `interval-${prev.id}-${curr.id}`,
        fromPoint: prev,
        toPoint: curr,
        deltaSeconds: deltaSec,
        deltaMinutes: deltaMin,
        category,
        isOver30Min: deltaMin > 30,
        isOver60Min: deltaMin > 60,
      });
    }

    return result;
  }, [allPoints]);

  // 2. Grouped slots (merge consecutive < 5min intervals when groupUnder5Min is true)
  const slots: ChronoSlot[] = useMemo(() => {
    if (!groupUnder5Min) {
      return rawIntervals.map(it => ({
        ...it,
        isGrouped: false,
        groupedCount: 1,
      }));
    }

    const merged: ChronoSlot[] = [];
    let currentBurst: typeof rawIntervals = [];

    const flushBurst = () => {
      if (currentBurst.length === 0) return;

      const totalSec = currentBurst.reduce((acc, it) => acc + it.deltaSeconds, 0);
      const totalMin = totalSec / 60;
      const startPt = currentBurst[0].fromPoint;
      const endPt = currentBurst[currentBurst.length - 1].toPoint;

      merged.push({
        id: `burst-${startPt.id}-${endPt.id}-${currentBurst.length}`,
        isGrouped: currentBurst.length > 1,
        groupedCount: currentBurst.length,
        fromPoint: startPt,
        toPoint: endPt,
        deltaSeconds: totalSec,
        deltaMinutes: totalMin,
        category: 'under5_grouped',
        isOver30Min: false,
        isOver60Min: false,
      });

      currentBurst = [];
    };

    for (let i = 0; i < rawIntervals.length; i++) {
      const it = rawIntervals[i];
      if (it.deltaMinutes < 5) {
        currentBurst.push(it);
      } else {
        flushBurst();
        merged.push({
          ...it,
          isGrouped: false,
          groupedCount: 1,
        });
      }
    }
    flushBurst();

    return merged;
  }, [rawIntervals, groupUnder5Min]);

  // 3. Statistics
  const stats = useMemo(() => {
    if (rawIntervals.length === 0) {
      return {
        total: 0,
        under5Count: 0,
        over30Count: 0,
        over60Count: 0,
        between30And60Count: 0,
        avgMin: 0,
        maxMin: 0,
        medianMin: 0,
      };
    }

    const under5 = rawIntervals.filter(it => it.deltaMinutes < 5);
    const over60 = rawIntervals.filter(it => it.isOver60Min);
    const between30And60 = rawIntervals.filter(it => it.isOver30Min && !it.isOver60Min);
    const over30 = rawIntervals.filter(it => it.isOver30Min);
    const sumMin = rawIntervals.reduce((acc, it) => acc + it.deltaMinutes, 0);
    const avgMin = sumMin / rawIntervals.length;

    const sortedMinutes = [...rawIntervals].map(it => it.deltaMinutes).sort((a, b) => a - b);
    const medianMin = sortedMinutes[Math.floor(sortedMinutes.length / 2)] || 0;
    const maxMin = sortedMinutes[sortedMinutes.length - 1] || 0;

    return {
      total: rawIntervals.length,
      under5Count: under5.length,
      over30Count: over30.length,
      over60Count: over60.length,
      between30And60Count: between30And60.length,
      avgMin,
      maxMin,
      medianMin,
    };
  }, [rawIntervals]);

  // 4. Displayed slots according to active filter mode
  const displayedSlots = useMemo(() => {
    if (intervalFilter === 'over60') {
      return slots.filter(it => it.isOver60Min);
    }
    if (intervalFilter === 'over30') {
      return slots.filter(it => it.isOver30Min);
    }
    return slots;
  }, [slots, intervalFilter]);

  const formatDuration = (mins: number) => {
    if (mins < 1) {
      return `${Math.round(mins * 60)} s`;
    }
    if (mins < 60) {
      const m = Math.floor(mins);
      const s = Math.round((mins - m) * 60);
      return s > 0 ? `${m}m ${s}s` : `${m} min`;
    }
    const h = Math.floor(mins / 60);
    const remM = Math.round(mins % 60);
    if (h >= 24) {
      const days = Math.floor(h / 24);
      const remH = h % 24;
      return `${days}j ${remH}h`;
    }
    return remM > 0 ? `${h}h ${remM}m` : `${h}h`;
  };

  const interruptionList = useMemo(() => {
    return rawIntervals.filter(it =>
      intervalFilter === 'over60' ? it.isOver60Min : it.isOver30Min
    );
  }, [rawIntervals, intervalFilter]);

  if (allPoints.length < 2) {
    return null;
  }

  // Max value for chart bar scaling
  const maxBarMinutes = Math.min(Math.max(stats.maxMin, 90), 240);

  return (
    <div className="bg-[#10172a] border border-slate-800 rounded-xl p-5 shadow-xl">
      {/* Top Header: Title, Alert Counters & Global Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                Chronogramme des intervalles de mesure
              </h3>
              {stats.over60Count > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3" />
                  {stats.over60Count} &gt; 60 min
                </span>
              )}
              {stats.between30And60Count > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  {stats.between30And60Count} entre 30 et 60 min
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Filtrer les intervalles met à jour la carte pour localiser les zones de faible rafraîchissement
            </p>
          </div>
        </div>

        {/* Right Controls: Grouping Toggle & Filter Tabs (Synchronized with Map) */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle to merge/group intervals < 5 min */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80">
            <button
              role="switch"
              aria-checked={groupUnder5Min}
              onClick={() => setGroupUnder5Min(!groupUnder5Min)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                groupUnder5Min ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  groupUnder5Min ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <span
              onClick={() => setGroupUnder5Min(!groupUnder5Min)}
              className="text-xs text-slate-200 font-medium select-none cursor-pointer flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Fusionner &lt; 5 min</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                groupUnder5Min ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'
              }`}>
                {groupUnder5Min ? 'Actif' : 'Détail'}
              </span>
            </span>
          </div>

          {/* Filter Mode Buttons: All, > 30 min, > 60 min (Controls Carte & Tableau) */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-700/60 text-xs">
            <button
              onClick={() => onIntervalFilterChange('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                intervalFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tous ({slots.length})
            </button>
            <button
              onClick={() => onIntervalFilterChange('over30')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                intervalFilter === 'over30'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-amber-400/90 hover:text-amber-300'
              }`}
              title="Filtrer la carte et le tableau pour les positions après un délai > 30 min"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>&gt; 30 min ({stats.over30Count})</span>
            </button>
            <button
              onClick={() => onIntervalFilterChange('over60')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                intervalFilter === 'over60'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : 'text-rose-400/90 hover:text-rose-300'
              }`}
              title="Filtrer la carte et le tableau pour les positions après une coupure > 60 min"
            >
              <AlertCircle className="w-3 h-3" />
              <span>&gt; 60 min ({stats.over60Count})</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row (Clicking a card toggles map filter) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 py-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            Intervalle moyen
          </div>
          <div className="text-base font-bold font-mono text-slate-100 mt-1">
            {formatDuration(stats.avgMin)}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            Intervalle médian
          </div>
          <div className="text-base font-bold font-mono text-slate-100 mt-1">
            {formatDuration(stats.medianMin)}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            Intervalle max
          </div>
          <div className="text-base font-bold font-mono text-slate-100 mt-1 truncate" title={formatDuration(stats.maxMin)}>
            {formatDuration(stats.maxMin)}
          </div>
        </div>

        <div
          onClick={() => onIntervalFilterChange(intervalFilter === 'over30' ? 'all' : 'over30')}
          className={`border rounded-lg p-3 cursor-pointer transition-all ${
            intervalFilter === 'over30'
              ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400 shadow-md'
              : stats.between30And60Count > 0
              ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60 text-amber-300'
              : 'bg-slate-900/60 border-slate-800 text-slate-300'
          }`}
          title="Cliquer pour afficher ces positions sur la carte"
        >
          <div className="text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              30 à 60 min
            </span>
            <span className="text-[10px] text-amber-400 underline">Filtrer</span>
          </div>
          <div className="text-base font-bold font-mono mt-1 text-amber-400">
            {stats.between30And60Count}
          </div>
        </div>

        <div
          onClick={() => onIntervalFilterChange(intervalFilter === 'over60' ? 'all' : 'over60')}
          className={`border rounded-lg p-3 cursor-pointer transition-all ${
            intervalFilter === 'over60'
              ? 'bg-rose-500/20 border-rose-400 text-rose-200 ring-1 ring-rose-400 shadow-md'
              : stats.over60Count > 0
              ? 'bg-rose-500/10 border-rose-500/40 hover:border-rose-500/70 text-rose-300'
              : 'bg-slate-900/60 border-slate-800 text-slate-300'
          }`}
          title="Cliquer pour afficher ces coupures sur la carte"
        >
          <div className="text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              &gt; 60 min (1h+)
            </span>
            <span className="text-[10px] text-rose-400 underline">Filtrer</span>
          </div>
          <div className="text-base font-bold font-mono mt-1 text-rose-400">
            {stats.over60Count}
          </div>
        </div>
      </div>

      {/* Visual Timeline Strip Chart */}
      <div className="mt-1 bg-[#0c1222] border border-slate-800/90 rounded-xl p-4">
        {/* Legend & Filter indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 mb-3 gap-2 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-sans font-medium text-xs">
              Créneaux affichés ({displayedSlots.length}) :
            </span>
            {groupUnder5Min && intervalFilter === 'all' && (
              <span className="text-[11px] text-emerald-400/90 font-sans">
                ({stats.under5Count} micro-intervalles fusionnés)
              </span>
            )}
            {intervalFilter !== 'all' && (
              <span className="text-[11px] text-amber-300 font-sans font-semibold">
                (Carte synchronisée sur les points de faible rafraîchissement)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3.5 text-[11px] font-sans">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-600 border border-slate-500" />
              <span>&lt; 5 min (groupé)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
              <span>5 à 30 min</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              <span>30 à 60 min</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 animate-pulse shadow-[0_0_6px_rgba(244,63,94,0.7)]" />
              <span>&gt; 60 min</span>
            </div>
          </div>
        </div>

        {/* Scrollable Timeline with Dual Reference Lines */}
        <div className="relative pt-8 pb-2 overflow-x-auto">
          {/* 60-min Reference Line */}
          <div
            style={{
              top: `${Math.max(10, 100 - (60 / maxBarMinutes) * 100)}%`,
            }}
            className="absolute left-0 right-0 border-b border-dashed border-rose-500/60 z-10 pointer-events-none flex justify-end"
          >
            <span className="bg-rose-950/90 text-rose-300 border border-rose-500/40 text-[9px] font-mono px-1.5 py-0.5 rounded -translate-y-1/2 shadow-sm">
              Seuil 60 min
            </span>
          </div>

          {/* 30-min Reference Line */}
          <div
            style={{
              top: `${Math.max(25, 100 - (30 / maxBarMinutes) * 100)}%`,
            }}
            className="absolute left-0 right-0 border-b border-dashed border-amber-500/50 z-10 pointer-events-none flex justify-end"
          >
            <span className="bg-amber-950/90 text-amber-300 border border-amber-500/40 text-[9px] font-mono px-1.5 py-0.5 rounded -translate-y-1/2 shadow-sm">
              Seuil 30 min
            </span>
          </div>

          {/* Bars */}
          <div className="flex items-end gap-2 min-w-max h-32 px-1 pb-1">
            {displayedSlots.map(slot => {
              const isSelected = selectedPoint?.id === slot.toPoint.id || selectedPoint?.id === slot.fromPoint.id;
              const isUnder5 = slot.category === 'under5_grouped';

              const heightPercent = isUnder5
                ? Math.min(Math.max((slot.deltaMinutes / maxBarMinutes) * 100, 12), 35)
                : Math.min(Math.max((slot.deltaMinutes / maxBarMinutes) * 100, 8), 100);

              let barBg = 'bg-indigo-600/70 group-hover:bg-indigo-500';
              if (slot.category === 'over60') {
                barBg = isSelected
                  ? 'bg-rose-400 ring-2 ring-rose-300 shadow-[0_0_14px_rgba(244,63,94,0.9)]'
                  : 'bg-rose-500 group-hover:bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]';
              } else if (slot.category === 'over30') {
                barBg = isSelected
                  ? 'bg-amber-300 ring-2 ring-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.8)]'
                  : 'bg-amber-500 group-hover:bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)]';
              } else if (isUnder5) {
                barBg = isSelected
                  ? 'bg-slate-300 ring-2 ring-indigo-400'
                  : 'bg-slate-700/80 hover:bg-slate-600 border-t border-x border-slate-600/80';
              } else if (isSelected) {
                barBg = 'bg-sky-400 ring-2 ring-white';
              }

              const barWidth = isUnder5 ? '32px' : '18px';

              return (
                <div
                  key={slot.id}
                  onClick={() => onSelectPoint(slot.toPoint)}
                  onMouseEnter={() => setHoveredSlot(slot)}
                  onMouseLeave={() => setHoveredSlot(null)}
                  className="group relative cursor-pointer flex flex-col items-center justify-end h-full transition-all"
                  style={{ width: barWidth }}
                >
                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-sm transition-all flex flex-col items-center justify-start ${barBg}`}
                  >
                    {isUnder5 && slot.groupedCount > 1 && (
                      <span className="text-[9px] font-mono text-slate-300 leading-none mt-1 font-bold select-none opacity-80">
                        {slot.groupedCount}
                      </span>
                    )}
                  </div>

                  {/* Marker Dot */}
                  {slot.category === 'over60' ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1" />
                  ) : slot.category === 'over30' ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Hover / Active Slot Tooltip Bar */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 min-h-[46px] flex items-center justify-between text-xs">
          {hoveredSlot ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 w-full text-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">
                  {hoveredSlot.isGrouped ? 'Session continue :' : 'Écart :'}
                </span>
                <span
                  className={`font-mono font-bold ${
                    hoveredSlot.category === 'over60'
                      ? 'text-rose-400'
                      : hoveredSlot.category === 'over30'
                      ? 'text-amber-400'
                      : hoveredSlot.isGrouped
                      ? 'text-slate-300'
                      : 'text-indigo-400'
                  }`}
                >
                  {formatDuration(hoveredSlot.deltaMinutes)}
                </span>

                {hoveredSlot.isGrouped && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
                    {hoveredSlot.groupedCount} mesures rapprochées (&lt; 5 min)
                  </span>
                )}

                {hoveredSlot.category === 'over60' && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    &gt; 60 min (1h+)
                  </span>
                )}

                {hoveredSlot.category === 'over30' && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    30 à 60 min
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                <span>De : {formatTimestamp(hoveredSlot.fromPoint.device_timestamp)}</span>
                <ArrowRight className="w-3 h-3 text-slate-600 inline" />
                <span>À : {formatTimestamp(hoveredSlot.toPoint.device_timestamp)}</span>
              </div>

              <div className="ml-auto text-[11px] text-slate-400 truncate max-w-xs">
                Lieu : <span className="text-slate-200">{hoveredSlot.toPoint.location_name}</span>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-[11px] flex items-center gap-2">
              <span>
                Cliquer sur un créneau zoome et centre la carte OpenStreetMap sur ce point géographique précis.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Critical & Warning Intervals Highlight Section ("Détail des interruptions et pauses") */}
      {(stats.over30Count > 0 || stats.over60Count > 0) && (
        <div className="mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2.5 gap-2">
            <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2 uppercase tracking-wider">
              <span>Détail des interruptions et pauses</span>
              <span className="font-mono text-rose-400 font-normal">
                ({stats.over60Count} &gt; 60 min
              </span>
              <span className="font-mono text-amber-400 font-normal">
                · {stats.between30And60Count} entre 30 et 60 min)
              </span>
            </h4>

            {/* Action link for "Tout afficher" (no internal scrollbar) */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400 hidden md:inline">
                Cliquer sur un élément pour localiser sur la carte
              </span>
              <button
                onClick={() => setShowAllInterruptions(!showAllInterruptions)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 transition-colors"
              >
                {showAllInterruptions ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Réduire la liste</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Tout afficher ({interruptionList.length} éléments)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Cards Grid: without internal scrollbar when showAllInterruptions is true */}
          <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 transition-all ${
              showAllInterruptions ? '' : 'max-h-60 overflow-y-auto pr-1'
            }`}
          >
            {interruptionList.map(it => {
              const isSelected = selectedPoint?.id === it.toPoint.id;
              const is60 = it.isOver60Min;

              return (
                <div
                  key={it.id}
                  onClick={() => onSelectPoint(it.toPoint)}
                  className={`cursor-pointer p-3 rounded-lg border text-xs transition-all ${
                    isSelected
                      ? is60
                        ? 'bg-rose-950/40 border-rose-400 shadow-md ring-1 ring-rose-400'
                        : 'bg-amber-950/40 border-amber-400 shadow-md ring-1 ring-amber-400'
                      : is60
                      ? 'bg-slate-900/70 border-rose-500/30 hover:border-rose-500/70 hover:bg-slate-800/80'
                      : 'bg-slate-900/60 border-amber-500/20 hover:border-amber-500/60 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-mono font-bold text-sm ${is60 ? 'text-rose-400' : 'text-amber-400'}`}>
                      + {formatDuration(it.deltaMinutes)}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold border ${
                        is60
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                          : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                      }`}
                    >
                      {is60 ? '🚨 Coupure > 60 min' : '⚠️ Pause > 30 min'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                    <span>{formatTimestamp(it.fromPoint.device_timestamp).slice(0, 12)}</span>
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                    <span className="text-slate-200">{formatTimestamp(it.toPoint.device_timestamp).slice(0, 12)}</span>
                  </div>

                  <div className="text-[11px] text-slate-300 truncate mt-1.5 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${is60 ? 'bg-rose-400' : 'bg-amber-400'}`} />
                    <span className="truncate">{it.toPoint.location_name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
