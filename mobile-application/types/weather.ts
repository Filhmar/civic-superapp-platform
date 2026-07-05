export interface Weather {
  temp_c: number;
  feels_like_c: number;
  condition: string;
  humidity: number;
  wind_kph: number;
  aqi: number;
  aqi_label: string;
  centroid: [number, number];
  as_of: string;
}
