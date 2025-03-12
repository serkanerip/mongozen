'use strict';

/** @type {import('mocha').MochaOptions} */
module.exports = {
  extension: ["ts"],
  spec: "src/**/*.test.ts",
  color: true,
  timeout: 30000,
  exit: true,
  'node-option': ['loader=ts-node/esm', 'no-warnings'],
}