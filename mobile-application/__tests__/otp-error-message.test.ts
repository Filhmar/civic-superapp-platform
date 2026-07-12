import { otpErrorMessage } from "@/services/auth";

// otpErrorMessage is pure and never touches the network, but services/auth.ts
// imports services/api.ts, which pulls in lib/token-refresh.ts ->
// services/secure-storage.ts -> @react-native-async-storage/async-storage.
// That native module isn't available under the jest-expo unit test
// environment (same reason lib/__tests__/token-refresh.test.ts mocks
// services/secure-storage) — mock the api layer out so it's never evaluated.
jest.mock("@/services/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

describe("otpErrorMessage", () => {
  it("maps 409 to the actionable 'register on Usapp' copy", () => {
    expect(otpErrorMessage({ status: 409, message: "x" })).toMatch(/Usapp/i);
    expect(otpErrorMessage({ status: 409, message: "x" })).toMatch(/register/i);
  });

  it("uses the server message for other statuses", () => {
    expect(otpErrorMessage({ status: 503, message: "We're busy" })).toBe("We're busy");
  });

  it("falls back to a generic message when none is present", () => {
    expect(otpErrorMessage({ status: 0 })).toMatch(/try again/i);
  });
});
