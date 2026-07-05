export interface TransportRoute {
  id: string;
  mode: string;
  name: string;
  stops: string[];
  fare_min: number;
  fare_max: number;
  popular: boolean;
}
