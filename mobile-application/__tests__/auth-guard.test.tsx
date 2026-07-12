import { render } from "@testing-library/react-native";

const mockUseAuth = jest.fn();
jest.mock("@/contexts/auth-context", () => ({ useAuth: () => mockUseAuth() }));
jest.mock("expo-router", () => ({
  Redirect: jest.fn(() => null),
  Stack: jest.fn(() => null),
}));

import { Redirect, Stack } from "expo-router";

import AuthLayout from "@/app/(auth)/_layout";

describe("auth group guard", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(["anonymous", "guest"] as const)("lets %s through", async (status) => {
    mockUseAuth.mockReturnValue({ status });
    await render(<AuthLayout />);
    expect(Stack).toHaveBeenCalled();
    expect(Redirect).not.toHaveBeenCalled();
  });

  it("redirects residents to tabs", async () => {
    mockUseAuth.mockReturnValue({ status: "resident" });
    await render(<AuthLayout />);
    expect(Redirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: "/(tabs)" }),
      undefined,
    );
    expect(Stack).not.toHaveBeenCalled();
  });
});
