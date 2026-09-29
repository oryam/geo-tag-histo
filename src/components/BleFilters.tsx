import React from 'react';
import { FilterState } from '../types/ble';
import { Search, RotateCcw, Filter, Radio, Target, Globe, Clock, AlertTriangle, AlertCircle } from 'lucide-react';

interface BleFiltersProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onReset: () => void;
  totalCount: number;
  filteredCount: number;
  devices: string[];
}

export const BleFilters: React.FC<BleFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  totalCount,
  filteredCount,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, searchQuery: e.target.value });
  };

  const handleRegionChange = (region: string) => {
    onFilterChange({ ...filters, selectedRegion: region });
  };

  const handleAccuracyChange = (maxAcc: number) => {
    onFilterChange({ ...filters, maxAccuracy: maxAcc });
  };

  const handleRssiChange = (minRssi: number) => {
    onFilterChange({ ...filters, minRssi: minRssi });
  };

  const handleIntervalFilterChange = (mode: 'all' | 'over30' | 'over60') => {
    onFilterChange({ ...filters, intervalFilter: mode });
  };

  const hasActiveFilters =
    filters.searchQuery !== '' ||
    filters.selectedRegion !== 'all' ||
    filters.maxAccuracy !== 200 ||
    filters.minRssi !== -120 ||
    filters.selectedDevice !== 'all' ||
    filters.intervalFilter !== 'all';

  return (
    <div className="bg-[#111827]/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-800/60">
        {/* Title & Filter badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Filtres de suivi
              <span className="text-xs font-mono font-normal text-slate-400 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                {filteredCount} / {totalCount} positions
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ces filtres s'appliquent en temps réel à la carte OpenStreetMap, au chronogramme et au tableau.
            </p>
          </div>
        </div>

        {/* Search input & Reset */}
        <div className="flex items-center gap-2.5 flex-1 lg:max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par lieu, payload, tag..."
              value={filters.searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700/70 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
        {/* 1. Interval / Refresh Rate Performance Filter */}
        <div>
          <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Taux de rafraîchissement
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => handleIntervalFilterChange('all')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                filters.intervalFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700/50'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => handleIntervalFilterChange('over30')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                filters.intervalFilter === 'over30'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-800/80 text-amber-400 hover:bg-slate-700/80 hover:text-amber-300 border border-amber-500/40'
              }`}
              title="Filtrer les positions après un délai supérieur à 30 min"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>&gt; 30 min</span>
            </button>
            <button
              onClick={() => handleIntervalFilterChange('over60')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                filters.intervalFilter === 'over60'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : 'bg-slate-800/80 text-rose-400 hover:bg-slate-700/80 hover:text-rose-300 border border-rose-500/40'
              }`}
              title="Filtrer les positions après une coupure supérieure à 60 min"
            >
              <AlertCircle className="w-3 h-3" />
              <span>&gt; 60 min</span>
            </button>
          </div>
        </div>

        {/* 2. Region Quick Selector */}
        <div>
          <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1.5">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            Étape de l'itinéraire
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'Toutes' },
              { id: 'seoul', label: 'Séoul' },
              { id: 'daejeon', label: 'Daejeon' },
              { id: 'daegu', label: 'Daegu' },
              { id: 'busan', label: 'Busan' },
              { id: 'korea', label: 'Corée' },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => handleRegionChange(r.id)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  filters.selectedRegion === r.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700/50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Accuracy Filter */}
        <div>
          <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1.5">
            <Target className="w-3.5 h-3.5 text-sky-400" />
            Précision max
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { val: 200, label: 'Toutes' },
              { val: 10, label: '≤ 10 m' },
              { val: 25, label: '≤ 25 m' },
              { val: 50, label: '≤ 50 m' },
            ].map(item => (
              <button
                key={item.val}
                onClick={() => handleAccuracyChange(item.val)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  filters.maxAccuracy === item.val
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700/50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. RSSI Signal Filter */}
        <div>
          <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            Signal BLE min
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { val: -120, label: 'Tous' },
              { val: -90, label: '≥ -90 dB' },
              { val: -80, label: '≥ -80 dB' },
              { val: -70, label: '≥ -70 dB' },
            ].map(item => (
              <button
                key={item.val}
                onClick={() => handleRssiChange(item.val)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  filters.minRssi === item.val
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700/50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
