module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // Strip console.* from production bundles.
      ...(process.env.NODE_ENV === "production"
        ? [["transform-remove-console"]]
        : []),
    ],
  };
};
