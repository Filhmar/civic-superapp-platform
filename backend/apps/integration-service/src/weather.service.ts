import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@app/common';
import { RedisService } from '@app/redis';

const CACHE_TTL_SECONDS = 600;

export interface WeatherReport {
  temp_c: number;
  feels_like_c: number;
  condition: string;
  humidity: number;
  wind_kph: number;
  aqi: number;
  aqi_label: string;
  centroid: [number, number];
  as_of: string;
  provider: string;
}

@Injectable()
export class WeatherService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: AppConfigService,
  ) {}

  async get(tenantId: string, centroid: [number, number], provider: string): Promise<WeatherReport> {
    const cacheKey = `weather:${tenantId}`;
    const cached = await this.redis.client.get(cacheKey).catch(() => null);
    if (cached) return JSON.parse(cached) as WeatherReport;

    const report =
      this.config.get('WEATHER_PROVIDER') === 'openweather' && this.config.get('OPENWEATHER_API_KEY')
        ? await this.fetchOpenWeather(centroid, provider)
        : this.mockReport(centroid, provider);

    await this.redis.client
      .set(cacheKey, JSON.stringify(report), 'EX', CACHE_TTL_SECONDS)
      .catch(() => undefined);
    return report;
  }

  private async fetchOpenWeather(
    centroid: [number, number],
    provider: string,
  ): Promise<WeatherReport> {
    // Real adapter goes here; fall back to mock so a missing key never breaks the home screen.
    return this.mockReport(centroid, provider);
  }

  /**
   * Deterministic per-location pseudo-weather: stable for a given centroid+hour,
   * so both tenants get plausible, distinct, cacheable data in development.
   */
  private mockReport(centroid: [number, number], provider: string): WeatherReport {
    const [lat, lon] = centroid;
    const hour = new Date().getUTCHours();
    const seed = Math.abs(Math.sin(lat * 12.9898 + lon * 78.233 + hour) * 43758.5453) % 1;
    const temp = 27 + seed * 6; // 27–33°C tropical band
    const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Thunderstorms'];
    const aqi = Math.round(35 + seed * 60);
    return {
      temp_c: Math.round(temp * 10) / 10,
      feels_like_c: Math.round((temp + 2 + seed) * 10) / 10,
      condition: conditions[Math.floor(seed * conditions.length)],
      humidity: Math.round(65 + seed * 25),
      wind_kph: Math.round(5 + seed * 20),
      aqi,
      aqi_label: aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : 'Unhealthy',
      centroid,
      as_of: new Date().toISOString(),
      provider,
    };
  }
}
