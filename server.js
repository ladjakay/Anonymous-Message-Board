'use strict';
require('dotenv').config();
const express     = require('express');
const bodyParser  = require('body-parser');
const helmet      = require('helmet');
const cors        = require('cors');

const database           = require('./database');
const apiRoutes         = require('./routes/api.js');
const fccTestingRoutes  = require('./routes/fcctesting.js');
const runner            = require('./test-runner');

const app = express();

app.use(helmet.frameguard({ action: 'sameorigin' }));
app.use(function (req, res, next) {
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/public', express.static(process.cwd() + '/public'));
app.use('/_api/app-info', cors({ origin: 'https://www.freecodecamp.org' }));
app.use('/api', cors({ origin: 'https://www.freecodecamp.org' }));

//Sample front-end
app.route('/b/:board/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/board.html');
  });
app.route('/b/:board/:threadid')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/thread.html');
  });

//Open the default board at the app's root URL.
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/board.html');
  });

//For FCC testing purposes
fccTestingRoutes(app);

//Routing for API 
apiRoutes(app);

//404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

function start() {
  database.ready
    .then(function () {
      const listener = app.listen(process.env.PORT || 3000, function () {
        console.log('Your app is listening on port ' + listener.address().port);
        if (process.env.NODE_ENV === 'test') {
          console.log('Running Tests...');
          setTimeout(function () {
            try {
              runner.run();
            } catch (error) {
              console.log('Tests are not valid:');
              console.error(error);
            }
          }, 1500);
        }
      });
    })
    .catch(function (error) {
      console.error('Unable to initialize SQLite database:', error.message);
      process.exitCode = 1;
    });
}

if (require.main === module) start();

module.exports = app; //for testing
