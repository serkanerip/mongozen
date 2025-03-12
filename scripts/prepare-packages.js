#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create directory if it doesn't exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Create CJS package.json
function createCjsPackageJson() {
  const cjsDir = path.join(__dirname, '../lib/cjs');
  ensureDirectoryExists(cjsDir);
  
  const packageJson = {
    type: 'commonjs'
  };
  
  fs.writeFileSync(
    path.join(cjsDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  console.log('Created CJS package.json');
}

// Create ESM package.json
function createEsmPackageJson() {
  const esmDir = path.join(__dirname, '../lib/esm');
  ensureDirectoryExists(esmDir);
  
  const packageJson = {
    type: 'module'
  };
  
  fs.writeFileSync(
    path.join(esmDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  console.log('Created ESM package.json');
}

// Run the script
createCjsPackageJson();
createEsmPackageJson();

console.log('Package preparation complete!');
