/**
 * Config-driven brand asset image: renders a plain RN <Image> only when the
 * URL is a real http(s) asset. When absent / non-http(s) / failed to load it
 * shows a fallback — an explicit one if provided (e.g. initials for avatars),
 * otherwise a branded ImagePlaceholder sized to the same slot.
 */
import { useState, type ReactNode } from "react";
import {
  Image,
  type ImageResizeMode,
  type ImageStyle,
  type StyleProp,
} from "react-native";
import { type LucideIcon } from "lucide-react-native";

import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { isRenderableAssetUrl } from "@/lib/asset-url";

interface AssetImageProps {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
  /** Explicit fallback (e.g. initials). If omitted, a branded ImagePlaceholder is used. */
  fallback?: ReactNode;
  /** Glyph for the default ImagePlaceholder when no explicit fallback is given. */
  placeholderIcon?: LucideIcon;
  accessibilityLabel?: string;
}

export function AssetImage({
  uri,
  style,
  resizeMode = "cover",
  fallback,
  placeholderIcon,
  accessibilityLabel,
}: AssetImageProps) {
  const [failed, setFailed] = useState(false);

  if (!isRenderableAssetUrl(uri) || failed) {
    return (
      <>
        {fallback ?? <ImagePlaceholder icon={placeholderIcon} style={style} />}
      </>
    );
  }

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
