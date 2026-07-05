/**
 * Checkerboard QR placeholder (DESIGN_SPEC §4 QR stub). Deterministic
 * pseudo-random pattern seeded from the payload string.
 */
import { View } from "react-native";

const GRID = 12;

function seededBits(seed: string, count: number): boolean[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const bits: boolean[] = [];
  for (let i = 0; i < count; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    bits.push((h & 1) === 1);
  }
  return bits;
}

export function QrPlaceholder({
  payload,
  size = 140,
}: {
  payload: string;
  size?: number;
}) {
  const cell = size / GRID;
  const bits = seededBits(payload || "qr", GRID * GRID);
  return (
    <View
      accessibilityLabel="QR code"
      style={{ width: size, height: size, borderRadius: 12, overflow: "hidden" }}
      className="bg-white"
    >
      {Array.from({ length: GRID }).map((_, row) => (
        <View key={row} style={{ flexDirection: "row" }}>
          {Array.from({ length: GRID }).map((__, col) => {
            const corner =
              (row < 3 && col < 3) ||
              (row < 3 && col >= GRID - 3) ||
              (row >= GRID - 3 && col < 3);
            const dark = corner
              ? !(row === 1 || row === GRID - 2 ? col % 2 === 1 : false)
              : bits[row * GRID + col];
            return (
              <View
                key={col}
                style={{
                  width: cell,
                  height: cell,
                  backgroundColor: dark ? "#1B2A20" : "#FFFFFF",
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}
