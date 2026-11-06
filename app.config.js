// Development builds get their own package name, so they install next to the
// Google Play version with separate data. Without APP_VARIANT, the config is
// app.json unchanged.
const IS_DEV = process.env.APP_VARIANT === "development";

export default ({ config }) =>
  IS_DEV
    ? {
        ...config,
        name: "Roolio Dev",
        android: {
          ...config.android,
          package: "com.shawndza.roolio.dev",
        },
      }
    : config;
