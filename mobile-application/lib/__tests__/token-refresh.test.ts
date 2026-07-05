/**
 * Transient-vs-dead refresh logic (STACK_BASIS §9) — the single most
 * important auth rule:
 *   401/403 → dead: clear tokens + emit "unauthenticated"
 *   429 / network error → transient: keep tokens, return null, no logout
 */
import { authEvents } from "@/lib/auth-events";
import { tokenRefreshManager } from "@/lib/token-refresh";
import { refreshToken } from "@/services/auth";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  storeTokens,
} from "@/services/secure-storage";

jest.mock("@/services/auth", () => ({
  refreshToken: jest.fn(),
}));

jest.mock("@/services/secure-storage", () => ({
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  storeTokens: jest.fn().mockResolvedValue(undefined),
  clearAuthTokens: jest.fn().mockResolvedValue(undefined),
}));

const mockRefreshToken = refreshToken as jest.MockedFunction<typeof refreshToken>;
const mockGetAccessToken = getAccessToken as jest.MockedFunction<
  typeof getAccessToken
>;
const mockGetRefreshToken = getRefreshToken as jest.MockedFunction<
  typeof getRefreshToken
>;
const mockStoreTokens = storeTokens as jest.MockedFunction<typeof storeTokens>;
const mockClearAuthTokens = clearAuthTokens as jest.MockedFunction<
  typeof clearAuthTokens
>;

describe("tokenRefreshManager transient-vs-dead", () => {
  let unauthenticatedEmitted: boolean;
  let unsubscribe: () => void;

  beforeEach(() => {
    jest.clearAllMocks();
    unauthenticatedEmitted = false;
    unsubscribe = authEvents.on("unauthenticated", () => {
      unauthenticatedEmitted = true;
    });
    // No usable access token → forces a refresh attempt.
    mockGetAccessToken.mockResolvedValue(null);
    mockGetRefreshToken.mockResolvedValue("a-refresh-token");
  });

  afterEach(() => {
    unsubscribe();
  });

  it("401 on refresh = dead session: clears tokens and emits unauthenticated", async () => {
    mockRefreshToken.mockResolvedValue({ status: 401, data: null });

    const result = await tokenRefreshManager.refreshIfNeeded();

    expect(result).toBeNull();
    expect(mockClearAuthTokens).toHaveBeenCalledTimes(1);
    expect(unauthenticatedEmitted).toBe(true);
  });

  it("403 on refresh = dead session: clears tokens and emits unauthenticated", async () => {
    mockRefreshToken.mockResolvedValue({ status: 403, data: null });

    const result = await tokenRefreshManager.refreshIfNeeded();

    expect(result).toBeNull();
    expect(mockClearAuthTokens).toHaveBeenCalledTimes(1);
    expect(unauthenticatedEmitted).toBe(true);
  });

  it("429 on refresh = transient: keeps tokens, returns null, no logout", async () => {
    mockRefreshToken.mockResolvedValue({ status: 429, data: null });

    const result = await tokenRefreshManager.refreshIfNeeded();

    expect(result).toBeNull();
    expect(mockClearAuthTokens).not.toHaveBeenCalled();
    expect(unauthenticatedEmitted).toBe(false);
  });

  it("network throw = transient: keeps tokens, returns null, no logout", async () => {
    mockRefreshToken.mockRejectedValue(new Error("Network error"));

    const result = await tokenRefreshManager.refreshIfNeeded();

    expect(result).toBeNull();
    expect(mockClearAuthTokens).not.toHaveBeenCalled();
    expect(unauthenticatedEmitted).toBe(false);
  });

  it("2xx stores the rotated pair and returns the fresh access token", async () => {
    mockRefreshToken.mockResolvedValue({
      status: 200,
      data: { accessToken: "new-at", refreshToken: "new-rt" },
    });

    const result = await tokenRefreshManager.refreshIfNeeded();

    expect(result).toBe("new-at");
    expect(mockStoreTokens).toHaveBeenCalledWith({
      accessToken: "new-at",
      refreshToken: "new-rt",
    });
    expect(mockClearAuthTokens).not.toHaveBeenCalled();
    expect(unauthenticatedEmitted).toBe(false);
  });

  it("no refresh token = silent null (not a failure, no logout event)", async () => {
    mockGetRefreshToken.mockResolvedValue(null);

    const result = await tokenRefreshManager.refreshIfNeeded();

    expect(result).toBeNull();
    expect(mockRefreshToken).not.toHaveBeenCalled();
    expect(mockClearAuthTokens).not.toHaveBeenCalled();
    expect(unauthenticatedEmitted).toBe(false);
  });
});
