const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx', 'mjs', 'cjs'];
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');

module.exports = config;
