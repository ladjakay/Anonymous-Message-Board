'use strict';

require('../server');
const runner = require('../test-runner');
const database = require('../database');

database.ready
  .then(function () {
    runner.once('done', function (report) {
      const failed = report.filter(test => test.state !== 'passed');
      process.exit(failed.length ? 1 : 0);
    });
    runner.run();
  })
  .catch(function (error) {
    console.error('Unable to initialize SQLite test database:', error.message);
    process.exitCode = 1;
  });
