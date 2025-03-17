'use strict';

/** @type {import('mocha').MochaOptions} */
module.exports = {
  extension: ["ts"],
  color: true,
  timeout: 30000,
  exit: true,
  'node-option': ['enable-source-maps', 'import=./register-hooks.mjs'],
}