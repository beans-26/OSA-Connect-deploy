const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Let Metro bundle ../shared (help-content.json is shared with the website)
config.watchFolders = [...(config.watchFolders || []), path.resolve(__dirname, '../shared')];

module.exports = config;
