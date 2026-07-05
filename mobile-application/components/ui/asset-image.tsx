/**
 * Config-driven brand asset image: renders a plain RN <Image> only when the
 * URL is a real http(s) asset, with BOTH an absent-URL fallback and an
 * onError fallback to the provided placeholder rendering.
 */
import { useState, type ReactNode } from "react";
import {
  Image,
  type ImageResizeMode,
  type ImageStyle,
  type StyleProp,
} from "react-native";

import { isRenderableAssetUrl } from "@/lib/asset-url";

interface AssetImageProps {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
  /** Rendered when the URL is absent/non-http(s) or the image fails to load. */
  fallback?: ReactNode;
  accessibilityLabel?: string;
}

export function AssetImage({
  uri,
  style,
  resizeMode = "cover",
  fallback = null,
  accessibilityLabel,
}: AssetImageProps) {
  const [failed, setFailed] = useState(false);

  if (!isRenderableAssetUrl(uri) || failed) return <>{fallback}</>;

  return (
    <Image
      source={{ uri: uri as string }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
