/** Weather + AQI card (DESIGN_SPEC §4): pale gradient, sun icon, AQI pill. */
import { Sun } from "lucide-react-native";
import { Text, View } from "react-native";

import { GradientBox } from "@/components/ui/gradient-box";
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
    <View className="mx-5 mt-6">
      <GradientBox
        stops={[
          { color: "#EAF4FB", offset: 0 },
          { color: "#F4FAF6", offset: 1 },
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.6 }}
        style={{
          borderRadius: 18,
          padding: 16,
          borderWidth: 1,
          borderColor: palette.line,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3.5">
            <Sun size={30} color="#F5A623" strokeWidth={2} />
            <View>
              <Text className="text-[24px] font-extrabold tracking-tight-5 text-fg">
                {Math.round(weather.temp_c)}°C
              </Text>
              <Text className="font-sans text-xs font-medium text-fg-2">
                {weather.condition} · feels {Math.round(weather.feels_like_c)}°C
              </Text>
            </View>
          </View>
          <View className="items-end">
            <AppText variant="caption">Air Quality</AppText>
            <View className="mt-1 rounded-full bg-[#E8F1FA] px-3 py-1.5">
              <Text
                className="text-xs font-bold"
                style={{ color: primary }}
              >
                ● {weather.aqi_label} · {weather.aqi}
              </Text>
            </View>
          </View>
        </View>
      </GradientBox>
    </View>
  );
}
