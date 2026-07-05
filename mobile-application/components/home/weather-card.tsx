/** Weather + AQI card from GET /v1/weather. */
import { CloudSun, Droplets, Wind } from "lucide-react-native";
import { Text, View } from "react-native";

import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import { useWeatherQuery } from "@/hooks/queries/use-weather";

export function WeatherCard() {
  const { config } = useTenantConfig();
  const { data: weather } = useWeatherQuery();

  if (!weather) return null;
  const primary = config?.brand.colors.primary ?? palette.brand;

  return (
    <View className="mt-6 rounded-2xl bg-surface p-5 dark:bg-surface-dark">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <CloudSun size={32} color={primary} />
          <View>
            <Text className="text-2xl font-bold text-fg dark:text-fg-dark">
              {Math.round(weather.temp_c)}°C
            </Text>
            <AppText variant="caption">{weather.condition}</AppText>
          </View>
        </View>
        <View className="items-end">
          <View className="rounded-full bg-tint px-3 py-1">
            <Text className="text-xs font-semibold text-fg-2">
              AQI {weather.aqi} · {weather.aqi_label}
            </Text>
          </View>
          <AppText variant="caption" className="mt-1">
            Feels like {Math.round(weather.feels_like_c)}°C
          </AppText>
        </View>
      </View>
      <View className="mt-3 flex-row gap-5">
        <View className="flex-row items-center gap-1.5">
          <Droplets size={14} color={palette["fg-2"]} />
          <AppText variant="caption">{weather.humidity}%</AppText>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Wind size={14} color={palette["fg-2"]} />
          <AppText variant="caption">{weather.wind_kph} km/h</AppText>
        </View>
      </View>
    </View>
  );
}
