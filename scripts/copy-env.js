const fs = require('fs');
const path = require('path');
require('dotenv').config();

const configContent = `
// Auto-generated configuration file
window.GOOGLE_MAPS_API_KEY = "${process.env.GOOGLE_MAPS_API_KEY || ''}";
`;

const configPath = path.join(__dirname, '../src/js/env-config.js');
fs.writeFileSync(configPath, configContent);

console.log('Environment configuration copied successfully');
