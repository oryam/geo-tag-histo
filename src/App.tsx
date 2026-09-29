import React, { useState, useMemo } from 'react';
import { BleLocationPoint, FilterState, SortField, SortDirection } from './types/ble';
import { INITIAL_CSV_RAW } from './data/rawCsv';
import { parseBleCsv } from './utils/geo';
import { BleFilters } from './components/BleFilters';
import { BleMap } from './components/BleMap';
import { BleChronogram } from './components/BleChronogram';
import { BleTable } from './components/BleTable';
import { CsvModal } from './components/CsvModal';
import { Radio, MapPin, Database } from 'lucide-react';

const initialFilters: FilterState = {
  searchQuery: '',
  startDate: '',
  endDate: '',
  minRssi: -120,
  maxAccuracy: 200,
  selectedDevice: 'all',
  selectedRegion: 'all',
  intervalFilter: 'all',
};

export default function App() {
  // Pure in-memory data state
  const [points, setPoints] = useState<BleLocationPoint[]>(() => parseBleCsv(INITIAL_CSV_RAW));
  const [selectedPoint, setSelectedPoint] = useState<BleLocationPoint | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [sortField, setSortField] = useState<SortField>('device_timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);

  // Filter points
  const filteredPoints = useMemo(() => {
    return points.filter(pt => {
      // Search query
      if (filters.searchQuery.trim() !== '') {
        const q = filters.searchQuery.toLowerCase();
        const matchesLocation = pt.location_name?.toLowerCase().includes(q);
        const matchesPayload = pt.device_payload.toLowerCase().includes(q);
        const matchesDevice = pt.device_name.toLowerCase().includes(q) || pt.device_id.toLowerCase().includes(q);
        const matchesNetwork = pt.network_type.toLowerCase().includes(q);
        if (!matchesLocation && !matchesPayload && !matchesDevice && !matchesNetwork) {
          return false;
        }
      }

      // Region / Step Filter
      if (filters.selectedRegion !== 'all') {
        const name = (pt.location_name || '').toLowerCase();
        if (filters.selectedRegion === 'seoul' && !name.includes('séoul') && !name.includes('seoul') && !name.includes('pangyo') && !name.includes('suwon')) return false;
        if (filters.selectedRegion === 'daejeon' && !name.includes('daejeon') && !name.includes('cheonan')) return false;
        if (filters.selectedRegion === 'daegu' && !name.includes('daegu') && !name.includes('gimcheon')) return false;
        if (filters.selectedRegion === 'busan' && !name.includes('busan') && !name.includes('ulsan') && !name.includes('gyeongju')) return false;
        if (filters.selectedRegion === 'korea' && !name.includes('corée') && !name.includes('korea')) return false;
      }

      // Max Accuracy
      if (pt.location_horizontal_accuracy > filters.maxAccuracy) {
        return false;
      }

      // Min RSSI
      if (pt.device_rssi !== null && pt.device_rssi < filters.minRssi) {
        return false;
      }

      // Interval / Refresh rate performance filter (> 30 min or > 60 min)
      if (filters.intervalFilter === 'over60') {
        if ((pt.interval_from_prev_min || 0) <= 60) return false;
      } else if (filters.intervalFilter === 'over30') {
        if ((pt.interval_from_prev_min || 0) <= 30) return false;
      }

      return true;
    });
  }, [points, filters]);

  // Sort filtered points
  const sortedPoints = useMemo(() => {
    const pts = [...filteredPoints];
    pts.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (valA === null || valA === undefined) valA = -9999;
      if (valB === null || valB === undefined) valB = -9999;

      if (typeof valA === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
    return pts;
  }, [filteredPoints, sortField, sortDirection]);

  // Unique devices list
  const deviceList = useMemo(() => {
    return Array.from(new Set(points.map(p => p.device_name)));
  }, [points]);

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleImportCsv = (newPoints: BleLocationPoint[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setPoints(newPoints);
      setSelectedPoint(null);
    } else {
      // Append without duplicating exact same (device_timestamp + lat + lon)
      const existingKeySet = new Set(points.map(p => `${p.device_timestamp}-${p.location_latitude}-${p.location_longitude}`));
      const uniqueNew = newPoints.filter(p => !existingKeySet.has(`${p.device_timestamp}-${p.location_latitude}-${p.location_longitude}`));
      setPoints(prev => [...prev, ...uniqueNew].sort((a, b) => b.device_timestamp - a.device_timestamp));
    }
  };

  const handleResetData = () => {
    setPoints(parseBleCsv(INITIAL_CSV_RAW));
    setSelectedPoint(null);
    setFilters(initialFilters);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      {/* Top Bar following contract: Brand, nav links, primary action */}
      <header className="sticky top-0 z-50 bg-[#0b0f19]/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight leading-none">
                Historique de géolocalisation
              </h1>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                <span>Tag GPS 0000-0000-0000-0001 (M4I-001)</span>
                <span>·</span>
                <span>Séoul → Busan</span>
                <span>·</span>
                <span className="text-emerald-400 flex items-center gap-1 font-mono">
                  <Database className="w-3 h-3" /> Données en mémoire
                </span>
              </div>
            </div>
          </div>

          {/* Zone 2: Informative breadcrumb & stats */}
          <div className="hidden md:flex items-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span>{points.length} points enregistrés</span>
            </div>
            <span>·</span>
            <div>Réseau : TERRESTRIAL</div>
          </div>

          {/* Zone 3: Action Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors whitespace-nowrap"
            >
              Gérer CSV
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* 1. Filter Bar (at the top of the page, applies to map and table) */}
        <BleFilters
          filters={filters}
          onFilterChange={setFilters}
          onReset={() => setFilters(initialFilters)}
          totalCount={points.length}
          filteredCount={sortedPoints.length}
          devices={deviceList}
        />

        {/* 2. Interactive OpenStreetMap Track Map (Refreshed when filtering intervals) */}
        <BleMap
          points={sortedPoints}
          selectedPoint={selectedPoint}
          onSelectPoint={pt => setSelectedPoint(pt)}
          intervalFilter={filters.intervalFilter}
          onResetIntervalFilter={() => setFilters(f => ({ ...f, intervalFilter: 'all' }))}
        />

        {/* 3. Chronogramme des intervalles de mesure (> 30 min and > 60 min highlighted) */}
        <BleChronogram
          allPoints={points}
          selectedPoint={selectedPoint}
          onSelectPoint={pt => setSelectedPoint(pt)}
          intervalFilter={filters.intervalFilter}
          onIntervalFilterChange={mode => setFilters(f => ({ ...f, intervalFilter: mode }))}
        />

        {/* 4. Data Table with Sorts, Pagination, and Expandable Telemetry */}
        <BleTable
          points={sortedPoints}
          selectedPoint={selectedPoint}
          onSelectPoint={pt => setSelectedPoint(pt)}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onOpenCsvModal={() => setIsCsvModalOpen(true)}
          onResetData={handleResetData}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        Historique de géolocalisation BLE · Carte OpenStreetMap · Données en mémoire uniquement
      </footer>

      {/* CSV Import/Export Modal */}
      <CsvModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImport={handleImportCsv}
        allPoints={points}
        filteredPoints={sortedPoints}
      />
    </div>
  );
}
