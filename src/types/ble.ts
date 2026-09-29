export interface BleLocationPoint {
  id: string; // unique internal ID
  device_counter: number;
  device_id: string;
  device_name: string;
  device_payload: string;
  device_rssi: number | null;
  device_sequence_number: number;
  device_tags__env: string;
  device_timestamp: number; // in seconds (float or int)
  location_altitude: number;
  location_horizontal_accuracy: number;
  location_latitude: number;
  location_longitude: number;
  location_timestamp: number; // in seconds
  location_vertical_accuracy: number;
  network_type: string;
  location_name?: string; // resolved or human-readable place name
  interval_from_prev_min?: number; // interval from chronological previous point
}

export type SortField =
  | 'device_timestamp'
  | 'location_timestamp'
  | 'device_payload'
  | 'location_name'
  | 'location_horizontal_accuracy'
  | 'device_rssi'
  | 'device_counter'
  | 'location_altitude';

export type SortDirection = 'asc' | 'desc';

export interface FilterState {
  searchQuery: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  minRssi: number; // -120 to 0
  maxAccuracy: number; // 0 to 200
  selectedDevice: string; // 'all' or device_id
  selectedRegion: string; // 'all', 'chile', 'france', 'china', 'belgium'
  intervalFilter: 'all' | 'over30' | 'over60';
}
