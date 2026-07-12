import { fireEvent, render, screen } from "@testing-library/react-native";

import { GradientBox } from "@/components/ui/gradient-box";

const layoutEvent = (w: number, h: number) => ({
  nativeEvent: { layout: { x: 0, y: 0, width: w, height: h } },
});

describe("GradientBox", () => {
  it("renders no svg before layout, numeric-sized svg after", async () => {
    await render(
      <GradientBox
        testID="box"
        stops={[
          { color: "#111111", offset: 0 },
          { color: "#222222", offset: 1 },
        ]}
      />,
    );
    // Before onLayout: only the opaque base color, no percentage-sized svg
    // (percentage Svg sizing is what broke on Android Fabric).
    expect(screen.queryByTestId("box-svg")).toBeNull();

    await fireEvent(screen.getByTestId("box"), "layout", layoutEvent(320, 180));

    const svg = screen.getByTestId("box-svg");
    expect(svg.props.width).toBe(320);
    expect(svg.props.height).toBe(180);
  });
});
