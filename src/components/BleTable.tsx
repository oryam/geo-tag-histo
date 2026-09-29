import React, { useState, useMemo } from 'react';
import {
  BleLocationPoint,
  SortField,
  SortDirection,
} from '../types/ble';
import { formatTimestamp, formatDetailedDate } from '../utils/geo';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Upload,
  Copy,
  Check,
  MapPin,
  Radio,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';

interface BleTableProps {
  points: BleLocationPoint[];
  selectedPoint: BleLocationPoint | null;
  onSelectPoint: (point: BleLocationPoint) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField) => void;
  onOpenCsvModal: () => void;
  onResetData: () => void;
}

export const BleTable: React.FC<BleTableProps> = ({
  points,
  selectedPoint,
  onSelectPoint,
  sortField,
  sortDirection,
  onSortChange,
  onOpenCsvModal,
  onResetData,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Precalculate chronological interval for each point
  const intervalInfoMap = useMemo(() => {
    const chrono = [...points].sort((a, b) => a.device_timestamp - b.device_timestamp);
    const map = new Map<string, { deltaMin: number; isOver30Min: boolean; isOver60Min: boolean }>();
    for (let i = 1; i < chrono.length; i++) {
      const deltaSec = chrono[i].device_timestamp - chrono[i - 1].device_timestamp;
      const deltaMin = deltaSec / 60;
      map.set(chrono[i].id, {
        deltaMin,
        isOver30Min: deltaMin > 30,
        isOver60Min: deltaMin > 60,
      });
    }
    return map;
  }, [points]);

  const totalPages = Math.ceil(points.length / pageSize) || 1;
  const paginatedPoints = points.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleCopyCoords = (lat: number, lon: number, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${lat}, ${lon}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-40 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-indigo-400 ml-1 inline" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-indigo-400 ml-1 inline" />
    );
  };

  const formatDeltaMin = (min: number) => {
    if (min < 60) {
      return `+${Math.round(min)} min`;
    }
    const h = Math.floor(min / 60);
    const remM = Math.round(min % 60);
    return `+${h}h ${remM > 0 ? `${remM}m` : ''}`;
  };

  return (
    <div className="bg-[#10172a] border border-slate-800 rounded-xl shadow-xl overflow-hidden">
      {/* Table Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-white tracking-wide">
            Données de géolocalisation horodatées
          </h3>
          <span className="text-xs font-mono text-slate-400">
            ({points.length} {points.length > 1 ? 'enregistrements' : 'enregistrement'})
          </span>
        </div>

        {/* Action Buttons: Import / Export CSV / Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={onResetData}
            title="Recharger le jeu de données d'origine"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Réinitialiser</span>
          </button>

          <button
            onClick={onOpenCsvModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import / Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-[#131b2e] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {/* TIMESTAMP */}
              <th
                onClick={() => onSortChange('device_timestamp')}
                className="py-3 px-4 cursor-pointer hover:text-slate-200 select-none transition-colors"
              >
                <div className="flex items-center">
                  <span>TIMESTAMP</span>
                  {renderSortIcon('device_timestamp')}
                </div>
              </th>

              {/* PAYLOAD */}
              <th
                onClick={() => onSortChange('device_payload')}
                className="py-3 px-4 cursor-pointer hover:text-slate-200 select-none transition-colors"
              >
                <div className="flex items-center">
                  <span>PAYLOAD</span>
                  {renderSortIcon('device_payload')}
                </div>
              </th>

              {/* LOCATION */}
              <th
                onClick={() => onSortChange('location_name')}
                className="py-3 px-4 cursor-pointer hover:text-slate-200 select-none transition-colors"
              >
                <div className="flex items-center">
                  <span>LOCATION</span>
                  {renderSortIcon('location_name')}
                </div>
              </th>

              {/* ACCURACY */}
              <th
                onClick={() => onSortChange('location_horizontal_accuracy')}
                className="py-3 px-4 cursor-pointer hover:text-slate-200 select-none transition-colors"
              >
                <div className="flex items-center">
                  <span>ACCURACY</span>
                  {renderSortIcon('location_horizontal_accuracy')}
                </div>
              </th>

              {/* NETWORK / RSSI */}
              <th
                onClick={() => onSortChange('device_rssi')}
                className="py-3 px-4 cursor-pointer hover:text-slate-200 select-none transition-colors text-center"
              >
                <div className="flex items-center justify-center">
                  <span>NETWORK</span>
                  {renderSortIcon('device_rssi')}
                </div>
              </th>

              {/* Expand Action */}
              <th className="py-3 px-4 w-12 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {paginatedPoints.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  Aucun point de géolocalisation ne correspond aux filtres appliqués.
                </td>
              </tr>
            ) : (
              paginatedPoints.map(pt => {
                const isSelected = selectedPoint?.id === pt.id;
                const isExpanded = expandedId === pt.id;
                const intervalInfo = intervalInfoMap.get(pt.id);

                // Accuracy styling
                let accuracyColor = 'text-slate-300';
                if (pt.location_horizontal_accuracy <= 10) {
                  accuracyColor = 'text-emerald-400';
                } else if (pt.location_horizontal_accuracy <= 25) {
                  accuracyColor = 'text-sky-400';
                } else if (pt.location_horizontal_accuracy > 50) {
                  accuracyColor = 'text-amber-400';
                }

                return (
                  <React.Fragment key={pt.id}>
                    <tr
                      onClick={() => onSelectPoint(pt)}
                      className={`cursor-pointer transition-colors duration-150 ${
                        isSelected
                          ? 'bg-indigo-950/40 border-l-2 border-indigo-400'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      {/* TIMESTAMP with optional >30min or >60min interval badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-slate-200">
                            {formatTimestamp(pt.device_timestamp)}
                          </span>
                          {intervalInfo?.isOver60Min ? (
                            <span
                              title={`Intervalle critique supérieur à 60 min (${formatDeltaMin(intervalInfo.deltaMin)})`}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
                            >
                              <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
                              {formatDeltaMin(intervalInfo.deltaMin)}
                            </span>
                          ) : intervalInfo?.isOver30Min ? (
                            <span
                              title={`Intervalle supérieur à 30 min (${formatDeltaMin(intervalInfo.deltaMin)})`}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                              {formatDeltaMin(intervalInfo.deltaMin)}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* PAYLOAD */}
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {pt.device_payload || '—'}
                      </td>

                      {/* LOCATION */}
                      <td className="py-3 px-4 text-slate-200 font-medium">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate max-w-xs">{pt.location_name}</span>
                        </div>
                      </td>

                      {/* ACCURACY */}
                      <td className={`py-3 px-4 font-mono font-semibold whitespace-nowrap ${accuracyColor}`}>
                        ± {Math.round(pt.location_horizontal_accuracy)}M
                      </td>

                      {/* NETWORK */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-300">
                          <Radio className="w-3 h-3 text-indigo-400" />
                          <span>{pt.network_type === 'TERRESTRIAL' ? '((•))' : pt.network_type}</span>
                          {pt.device_rssi !== null && (
                            <span className="font-mono text-slate-400 ml-1">
                              {pt.device_rssi} dBm
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Expand Chevron */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={e => toggleExpand(pt.id, e)}
                          className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Détails de la trame"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Telemetry Drawer */}
                    {isExpanded && (
                      <tr className="bg-[#0c1222] border-b border-indigo-950/60">
                        <td colSpan={6} className="py-4 px-6 text-xs text-slate-300">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Column 1: GPS Position & Accuracy */}
                            <div className="space-y-2">
                              <h4 className="text-[11px] uppercase font-bold tracking-wider text-indigo-400">
                                Coordonnées & Précision
                              </h4>
                              <div className="flex items-center justify-between text-slate-400">
                                <span>Latitude / Longitude :</span>
                                <div className="flex items-center gap-1.5 font-mono text-slate-100">
                                  <span>
                                    {pt.location_latitude.toFixed(6)}, {pt.location_longitude.toFixed(6)}
                                  </span>
                                  <button
                                    onClick={e =>
                                      handleCopyCoords(pt.location_latitude, pt.location_longitude, pt.id, e)
                                    }
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                                    title="Copier les coordonnées"
                                  >
                                    {copiedId === pt.id ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-slate-400">
                                <span>Altitude :</span>
                                <span className="font-mono text-slate-100">
                                  {pt.location_altitude.toFixed(2)} mètres
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-400">
                                <span>Précision horizontale :</span>
                                <span className="font-mono text-slate-100">
                                  ± {pt.location_horizontal_accuracy.toFixed(2)} m
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-400">
                                <span>Précision verticale :</span>
                                <span className="font-mono text-slate-100">
                                  ± {pt.location_vertical_accuracy.toFixed(2)} m
                                </span>
                              </div>
                            </div>

                            {/* Column 2: BLE Device & Signal */}
                            <div className="space-y-2">
                              <h4 className="text-[11px] uppercase font-bold tracking-wider text-indigo-400">
                                Équipement & Transmission BLE
                              </h4>
                              <div className="flex items-center justify-between text-slate-400">
                                <span>Nom de l'équipement :</span>
                                <span className="font-mono font-semibold text-slate-100">
                                  {pt.device_name}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-400">
                                <span>Identifiant ID :</span>
                                <span className="font-mono text-[11px] text-slate-300 truncate max-w-[170px]" title={pt.device_id}>
                                  {pt.device_id}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-400">
                                <span>Compteur / Séquence :</span>
                                <span className="font-mono text-slate-100">
                                  #{pt.device_counter} (Seq: {pt.device_sequence_number})
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-400">
                                <span>Signal RSSI :</span>
                                <span className="font-mono text-slate-100">
                                  {pt.device_rssi !== null ? `${pt.device_rssi} dBm` : 'Inconnu'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-400">
                                <span>Environnement tag :</span>
                                <span className="font-mono text-emerald-400">
                                  {pt.device_tags__env}
                                </span>
                              </div>
                            </div>

                            {/* Column 3: Timestamps, Interval & Quick Map Action */}
                            <div className="space-y-2 flex flex-col justify-between">
                              <div>
                                <h4 className="text-[11px] uppercase font-bold tracking-wider text-indigo-400 mb-2">
                                  Horodatages & Intervalles
                                </h4>
                                <div className="flex items-center justify-between text-slate-400 mb-1">
                                  <span>Horodatage device :</span>
                                  <span className="font-mono text-slate-200">
                                    {formatDetailedDate(pt.device_timestamp)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-400 mb-1">
                                  <span>Écart prise précédente :</span>
                                  <span
                                    className={`font-mono font-bold ${
                                      intervalInfo?.isOver60Min
                                        ? 'text-rose-400'
                                        : intervalInfo?.isOver30Min
                                        ? 'text-amber-400'
                                        : 'text-slate-200'
                                    }`}
                                  >
                                    {intervalInfo
                                      ? `${formatDeltaMin(intervalInfo.deltaMin)} ${
                                          intervalInfo.isOver60Min
                                            ? '(> 60 min 🚨)'
                                            : intervalInfo.isOver30Min
                                            ? '(> 30 min ⚠️)'
                                            : ''
                                        }`
                                      : 'Point initial'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-400">
                                  <span>Écart GPS vs BLE :</span>
                                  <span className="font-mono text-slate-300">
                                    {Math.abs(Math.round(pt.device_timestamp - pt.location_timestamp))} sec
                                  </span>
                                </div>
                              </div>

                              <div className="pt-2">
                                <button
                                  onClick={() => onSelectPoint(pt)}
                                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-colors text-xs font-medium"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Afficher et zoomer sur la carte</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-900/40 text-xs text-slate-400">
          <div>
            Page <span className="font-semibold text-slate-200">{currentPage}</span> sur{' '}
            <span className="font-semibold text-slate-200">{totalPages}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-medium transition-colors"
            >
              Précédent
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-medium transition-colors"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
