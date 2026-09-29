import { BleLocationPoint } from '../types/ble';

/**
 * Resolves place name based on coordinates or fallback format.
 */
export function getPlaceName(lat: number, lon: number): string {
  // South Korea - Seoul to Busan Itinerary
  if (lat >= 37.50 && lat <= 37.60 && lon >= 126.90 && lon <= 127.05) {
    return 'Séoul (Gare centrale), Corée du Sud';
  }
  if (lat >= 37.35 && lat <= 37.45 && lon >= 127.06 && lon <= 127.16) {
    return 'Pangyo (Seongnam), Corée du Sud';
  }
  if (lat >= 37.22 && lat <= 37.30 && lon >= 126.95 && lon <= 127.05) {
    return 'Suwon (Gare de Suwon), Corée du Sud';
  }
  if (lat >= 36.75 && lat <= 36.85 && lon >= 127.05 && lon <= 127.15) {
    return 'Cheonan-Asan, Chungnam, Corée du Sud';
  }
  if (lat >= 36.28 && lat <= 36.38 && lon >= 127.38 && lon <= 127.48) {
    return 'Daejeon (Gare de Daejeon), Corée du Sud';
  }
  if (lat >= 36.08 && lat <= 36.18 && lon >= 128.12 && lon <= 128.24) {
    return 'Gimcheon-Gumi, Gyeongbuk, Corée du Sud';
  }
  if (lat >= 35.83 && lat <= 35.92 && lon >= 128.58 && lon <= 128.68) {
    return 'Daegu (Dongdaegu), Corée du Sud';
  }
  if (lat >= 35.75 && lat <= 35.85 && lon >= 129.08 && lon <= 129.20) {
    return 'Gyeongju (Singyeongju), Corée du Sud';
  }
  if (lat >= 35.50 && lat <= 35.60 && lon >= 129.08 && lon <= 129.20) {
    return 'Ulsan (Gare d’Ulsan), Corée du Sud';
  }
  if (lat >= 35.05 && lat <= 35.18 && lon >= 128.98 && lon <= 129.10) {
    return 'Busan (Gare de Busan), Corée du Sud';
  }

  // Chile - Limache & Valparaíso area
  if (lat >= -33.05 && lat <= -32.95 && lon >= -71.32 && lon <= -71.22) {
    return 'Limache, CL-VS, Chile';
  }
  // Chile - Pudahuel / Santiago Airport area
  if (lat >= -33.43 && lat <= -33.36 && lon >= -70.82 && lon <= -70.75) {
    return 'Pudahuel, CL-RM, Chile';
  }
  // Chile - San Felipe / Panquehue
  if (lat >= -32.92 && lat <= -32.85 && lon >= -70.85 && lon <= -70.78) {
    return 'Llaillay, CL-VS, Chile';
  }
  // France - Roissy CDG Airport area
  if (lat >= 48.98 && lat <= 49.03 && lon >= 2.53 && lon <= 2.62) {
    return 'Roissy-en-France, Île-de-France, France';
  }
  // France - Paris intra-muros
  if (lat >= 48.81 && lat <= 48.92 && lon >= 2.25 && lon <= 2.42) {
    return 'Paris, Île-de-France, France';
  }
  // France - Le Bourget / Seine-Saint-Denis
  if (lat >= 48.93 && lat <= 48.97 && lon >= 2.44 && lon <= 2.50) {
    return 'Le Bourget, Île-de-France, France';
  }
  // Belgium - Brussels Airport area
  if (lat >= 50.85 && lat <= 50.95 && lon >= 4.40 && lon <= 4.52) {
    return 'Zaventem, Bruxelles, Belgique';
  }
  // China - Wuhan High-Tech zone
  if (lat >= 30.40 && lat <= 30.55 && lon >= 114.40 && lon <= 114.55) {
    return 'Wuhan, Hubei, Chine';
  }

  // Generic coordinate formatting
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lonStr}`;
}

/**
 * Format timestamp (in seconds) to screenshot style: "Sep 29, 2026 · 17:10:02"
 */
export function formatTimestamp(sec: number): string {
  const d = new Date(sec * 1000);
  if (isNaN(d.getTime())) return '—';

  // Format month name in English as in the screenshot: "Sep 29, 2026 · 17:10:02"
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');

  return `${month} ${day}, ${year} · ${hours}:${minutes}:${seconds}`;
}

/**
 * Format timestamp into detailed French string
 */
export function formatDetailedDate(sec: number): string {
  const d = new Date(sec * 1000);
  if (isNaN(d.getTime())) return '—';
  return d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

/**
 * Parse CSV raw text into BleLocationPoint[]
 */
export function parseBleCsv(csvText: string): BleLocationPoint[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse header
  const headerLine = lines[0].replace(/^\uFEFF/, '').trim();
  const headers = headerLine.split(',').map(h => h.trim());

  const points: BleLocationPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle commas (none of these fields contain quoted commas, standard BLE log)
    const values = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx].trim() : '';
    });

    const lat = parseFloat(row['location_latitude']);
    const lon = parseFloat(row['location_longitude']);
    if (isNaN(lat) || isNaN(lon)) continue;

    const devTs = parseFloat(row['device_timestamp']) || 0;
    const locTs = parseFloat(row['location_timestamp']) || devTs;
    const rssiVal = row['device_rssi'] !== '' ? parseFloat(row['device_rssi']) : null;

    points.push({
      id: `pt-${i}-${devTs}-${Math.random().toString(36).substring(2, 7)}`,
      device_counter: parseInt(row['device_counter'], 10) || 0,
      device_id: row['device_id'] || 'unknown',
      device_name: row['device_name'] || 'BLE-TAG',
      device_payload: row['device_payload'] || '',
      device_rssi: isNaN(rssiVal as number) ? null : rssiVal,
      device_sequence_number: parseInt(row['device_sequence_number'], 10) || 0,
      device_tags__env: row['device_tags__env'] || 'production',
      device_timestamp: devTs,
      location_altitude: parseFloat(row['location_altitude']) || 0,
      location_horizontal_accuracy: parseFloat(row['location_horizontal_accuracy']) || 0,
      location_latitude: lat,
      location_longitude: lon,
      location_timestamp: locTs,
      location_vertical_accuracy: parseFloat(row['location_vertical_accuracy']) || 0,
      network_type: row['network_type'] || 'TERRESTRIAL',
      location_name: getPlaceName(lat, lon),
    });
  }

  // Sort ascending first to compute interval from previous point
  points.sort((a, b) => a.device_timestamp - b.device_timestamp);
  for (let k = 0; k < points.length; k++) {
    if (k === 0) {
      points[k].interval_from_prev_min = 0;
    } else {
      const deltaSec = Math.max(0, points[k].device_timestamp - points[k - 1].device_timestamp);
      points[k].interval_from_prev_min = deltaSec / 60;
    }
  }

  // Sort descending by device_timestamp by default (newest first, as in the user screenshot)
  return points.sort((a, b) => b.device_timestamp - a.device_timestamp);
}

/**
 * Export array of BleLocationPoint to CSV string
 */
export function exportToCsv(points: BleLocationPoint[]): string {
  const headers = [
    'device_counter',
    'device_id',
    'device_name',
    'device_payload',
    'device_rssi',
    'device_sequence_number',
    'device_tags__env',
    'device_timestamp',
    'location_altitude',
    'location_horizontal_accuracy',
    'location_latitude',
    'location_longitude',
    'location_timestamp',
    'location_vertical_accuracy',
    'network_type',
  ];

  const rows = points.map(pt => [
    pt.device_counter,
    pt.device_id,
    pt.device_name,
    pt.device_payload,
    pt.device_rssi !== null ? pt.device_rssi : '',
    pt.device_sequence_number,
    pt.device_tags__env,
    pt.device_timestamp,
    pt.location_altitude,
    pt.location_horizontal_accuracy,
    pt.location_latitude,
    pt.location_longitude,
    pt.location_timestamp,
    pt.location_vertical_accuracy,
    pt.network_type,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Download a string content as a CSV file in browser
 */
export function downloadCsvFile(content: string, filename = 'historique_geolocalisation.csv') {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
