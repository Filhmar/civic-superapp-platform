import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import { getWeather } from "@/services/weather";

export function useWeatherQuery() {
  return useQuery({
    queryKey: queryKeys.weather.all,
    queryFn: getWeather,
    staleTime: 10 * 60 * 1000,
  });
}
