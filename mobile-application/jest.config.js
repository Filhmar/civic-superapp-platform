/** Two projects: RN unit tests (jest-expo) + node-env integration tests. */
module.exports = {
  projects: [
    {
      displayName: "unit",
      preset: "jest-expo",
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
      testMatch: [
        "<rootDir>/lib/__tests__/**/*.test.{ts,tsx}",
        "<rootDir>/components/__tests__/**/*.test.{ts,tsx}",
      ],
    },
    {
      displayName: "integration",
      testEnvironment: "node",
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
      testMatch: ["<rootDir>/__tests__/integration/**/*.test.ts"],
      transform: { "^.+\\.[jt]sx?$": "babel-jest" },
      // babel-preset-expo rewrites process.env.EXPO_PUBLIC_* into an ESM
      // import of expo/virtual/env — transform that module too in node env.
      transformIgnorePatterns: ["/node_modules/(?!expo/virtual/)"],
    },
  ],
};
