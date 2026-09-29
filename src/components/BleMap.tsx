import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { BleLocationPoint } from '../types/ble';
import { formatTimestamp } from '../utils/geo';
import { Maximize2, Radio, Navigation, AlertTriangle, AlertCircle, RotateCcw } from 'lucide-react';

interface BleMapProps {
  points: BleLocationPoint[];
  selectedPoint: BleLocationPoint | null;
  onSelectPoint: (point: BleLocationPoint) => void;
  intervalFilter?: 'all' | 'over30' | 'over60';
  onResetIntervalFilter?: () => void;
}

export const BleMap: React.FC<BleMapProps> = ({
  points,
  selectedPoint,
  onSelectPoint,
  intervalFilter = 'all',
  onResetIntervalFilter,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [showAccuracyCircles, setShowAccuracyCircles] = useState(true);

  // Initialize Leaflet Map with OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: true,
      }).setView([36.3325, 127.8], 7);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap standard tiles
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributeurs',
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Ensure proper sizing after DOM render
      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    }

    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    observer.observe(mapContainerRef.current);

    return () => {
      observer.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Points, Polylines and Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    if (points.length === 0) return;

    // Chronological order for path line
    const chronoPoints = [...points].sort((a, b) => a.device_timestamp - b.device_timestamp);
    const latLngs = chronoPoints.map(p => [p.location_latitude, p.location_longitude] as [number, number]);

    // Draw path polyline on OpenStreetMap if we have more than 1 point
    if (latLngs.length > 1) {
      const polyline = L.polyline(latLngs, {
        color: intervalFilter === 'all' ? '#4f46e5' : '#f59e0b',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '6, 6',
        lineCap: 'round',
      });
      layerGroup.addLayer(polyline);
    }

    // Latest point is the newest timestamp
    const latestPt = points[0];
    const initialPt = points[points.length - 1];

    points.forEach(pt => {
      const isSelected = selectedPoint?.id === pt.id;
      const isLatest = pt.id === latestPt.id && intervalFilter === 'all';
      const isInitial = pt.id === initialPt.id && points.length > 1 && intervalFilter === 'all';
      const intervalMin = pt.interval_from_prev_min || 0;
      const isOver60 = intervalMin > 60;
      const isOver30 = intervalMin > 30 && !isOver60;

      // Color selection according to refresh rate performance
      let fillColor = '#4f46e5';
      let strokeColor = '#ffffff';
      let radius = 6;

      if (isOver60) {
        fillColor = '#f43f5e'; // Critical gap > 60 min (Red/Rose)
        strokeColor = '#ffffff';
        radius = 9;
      } else if (isOver30) {
        fillColor = '#f59e0b'; // Degraded refresh rate > 30 min (Amber)
        strokeColor = '#ffffff';
        radius = 8;
      } else if (isLatest) {
        fillColor = '#059669'; // Latest
        radius = 8;
      } else if (isInitial) {
        fillColor = '#d97706'; // Starting point
        radius = 7;
      }

      if (isSelected) {
        fillColor = '#0284c7';
        strokeColor = '#facc15';
        radius = 11;
      }

      // Draw accuracy radius circle if enabled
      if (showAccuracyCircles && pt.location_horizontal_accuracy > 0) {
        const circle = L.circle([pt.location_latitude, pt.location_longitude], {
          radius: pt.location_horizontal_accuracy,
          color: isSelected ? '#0284c7' : fillColor,
          weight: 1.5,
          opacity: 0.5,
          fillColor: isSelected ? '#0284c7' : fillColor,
          fillOpacity: 0.1,
        });
        layerGroup.addLayer(circle);
      }

      // Marker
      const marker = L.circleMarker([pt.location_latitude, pt.location_longitude], {
        radius,
        fillColor,
        color: strokeColor,
        weight: isSelected ? 3 : 2,
        opacity: 1,
        fillOpacity: 0.95,
      });

      // Format interval alert for popup
      let intervalBadgeHtml = '';
      if (intervalMin > 60) {
        const h = Math.floor(intervalMin / 60);
        const remM = Math.round(intervalMin % 60);
        intervalBadgeHtml = `
          <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 4px 6px; margin-bottom: 6px; color: #be123c; font-weight: 700; font-size: 11px;">
            🚨 Coupure de signal &gt; 60 min (+${h}h ${remM > 0 ? `${remM}m` : ''})
          </div>
        `;
      } else if (intervalMin > 30) {
        intervalBadgeHtml = `
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 4px 6px; margin-bottom: 6px; color: #b45309; font-weight: 700; font-size: 11px;">
            ⚠️ Faible taux de rafraîchissement (+${Math.round(intervalMin)} min)
          </div>
        `;
      }

      // Marker Popup
      const popupHtml = `
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; font-size: 12px; color: #0f172a; min-width: 200px; padding: 2px;">
          ${intervalBadgeHtml}
          <div style="font-weight: 700; color: #1e1b4b; margin-bottom: 5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; font-size: 13px;">
            ${pt.location_name || 'Position BLE'}
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="color: #64748b;">Horodatage :</span>
            <span style="font-family: monospace; font-weight: 600;">${formatTimestamp(pt.device_timestamp)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="color: #64748b;">Précision :</span>
            <span style="font-weight: 600; color: #059669;">± ${pt.location_horizontal_accuracy.toFixed(1)} m</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="color: #64748b;">Altitude :</span>
            <span style="font-weight: 600;">${pt.location_altitude.toFixed(1)} m</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
            <span style="color: #64748b;">Signal RSSI :</span>
            <span style="font-weight: 600;">${pt.device_rssi !== null ? `${pt.device_rssi} dBm` : 'N/A'}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Tag / Compteur :</span>
            <span style="font-weight: 600;">${pt.device_name} (#${pt.device_counter})</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        closeButton: true,
        autoPan: false,
      });

      marker.on('click', () => {
        onSelectPoint(pt);
      });

      layerGroup.addLayer(marker);
    });

    // Auto-fit bounds on point updates or filter change
    if (latLngs.length > 0 && !selectedPoint) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [points, showAccuracyCircles, intervalFilter]);

  // Center on selected point when clicked from table or chronogramme
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedPoint) return;

    map.flyTo([selectedPoint.location_latitude, selectedPoint.location_longitude], 15, {
      duration: 0.8,
    });
  }, [selectedPoint]);

  const handleFitBounds = () => {
    const map = mapInstanceRef.current;
    if (!map || points.length === 0) return;
    const latLngs = points.map(p => [p.location_latitude, p.location_longitude] as [number, number]);
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  };

  return (
    <div className="relative w-full h-[440px] lg:h-[500px] rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900 shadow-xl">
      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Active Filter Alert Banner (When filtered by interval) */}
      {intervalFilter !== 'all' && (
        <div className="absolute top-3 left-3 z-[1000] bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-lg border border-amber-500/60 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            {intervalFilter === 'over60' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>
                  {intervalFilter === 'over60' ? 'Coupures > 60 min' : 'Intervalles > 30 min'}
                </span>
                <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                  {points.length} position{points.length > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-[10px] text-slate-300">
                Lieux où le taux de rafraîchissement a été le moins performant
              </p>
            </div>
          </div>
          {onResetIntervalFilter && (
            <button
              onClick={onResetIntervalFilter}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700 transition-colors whitespace-nowrap ml-2"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Voir tout</span>
            </button>
          )}
        </div>
      )}

      {/* Floating Controls Bar */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-lg border border-slate-700 shadow-lg text-xs">
        {/* Fit Bounds */}
        <button
          onClick={handleFitBounds}
          title="Centrer la vue sur l'ensemble du parcours"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline font-medium">Recadrer le parcours</span>
        </button>

        {/* Toggle Accuracy Circles */}
        <button
          onClick={() => setShowAccuracyCircles(!showAccuracyCircles)}
          title="Afficher/Masquer les cercles de précision"
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-colors ${
            showAccuracyCircles
              ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-medium">Rayon précision (± m)</span>
        </button>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700 shadow-lg text-[11px] text-slate-300 flex flex-wrap items-center gap-3">
        {intervalFilter === 'all' ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
              <span className="font-medium text-slate-200">Dernière position</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <span>≤ 30 min</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>30 à 60 min</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>&gt; 60 min</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]" />
              <span className="font-medium text-rose-300">&gt; 60 min</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
              <span className="font-medium text-amber-300">30 à 60 min</span>
            </div>
          </>
        )}
      </div>

      {/* Selected Location Banner */}
      {selectedPoint && (
        <div className="absolute bottom-3 right-3 z-[1000] bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 rounded-lg border border-indigo-500/70 shadow-2xl text-xs max-w-xs sm:max-w-md animate-in fade-in">
          <div className="flex items-center gap-1.5 text-indigo-400 font-semibold mb-0.5">
            <Navigation className="w-3.5 h-3.5" />
            <span>Position sélectionnée</span>
            {selectedPoint.interval_from_prev_min && selectedPoint.interval_from_prev_min > 30 && (
              <span className={`text-[10px] font-mono px-1 rounded ${
                selectedPoint.interval_from_prev_min > 60
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                +{Math.round(selectedPoint.interval_from_prev_min)} min
              </span>
            )}
          </div>
          <div className="text-slate-100 font-medium truncate">{selectedPoint.location_name}</div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            {formatTimestamp(selectedPoint.device_timestamp)} · {selectedPoint.location_latitude.toFixed(5)}, {selectedPoint.location_longitude.toFixed(5)}
          </div>
        </div>
      )}
    </div>
  );
};
