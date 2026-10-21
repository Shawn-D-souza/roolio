// Learn more https://docs.expo.dev/guides/customizing-metro/
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// The website in site/ is a separate project with its own node_modules.
// Keep Metro from crawling or resolving anything in it. Metro tests some
// paths absolute and some relative to the project root, so match both.
const siteDir = path.join(__dirname, "site");
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  new RegExp(`^${escape(siteDir)}(?:[\\\\/].*)?$`),
  /^site(?:[\\/].*)?$/,
];

module.exports = config;
