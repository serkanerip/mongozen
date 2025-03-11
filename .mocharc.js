module.exports = {
  timeout: 30000, // Increased timeout for MongoDB operations
  exit: true, // Force Mocha to exit after tests complete
  require: ['./test/setup.js']
};
