var express = require('express');
var compression = require('compression');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var expressMongoDb = require('express-mongo-db');

var cors = require('cors');

// Logging
var winston = require('winston');
require('winston-mongodb').MongoDB;

const config = require('config');

var app = express();

app.set('trust proxy', 1);

app.use(compression());

// winston logging setup
if (app.get('env') !== 'test') {
    winston.add(winston.transports.MongoDB, {
        db: config.get('MONGODB_URI'),
    });
}
if (app.get('env') === 'test') {
    winston.remove(winston.transports.Console);
}

if (app.get('env') !== 'test') {
    app.use(logger('dev'));
}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(expressMongoDb(config.get('MONGODB_URI')));
app.use(require('./middlewares').expressRedisDb(config.get('REDIS_URL')));

app.use(cors({
    origin: [
        /\.goodjob\.life$/,
        'http://localhost:8080',
        'http://localhost:8000',
    ],
}));

app.use('/', routes);
app.use('/companies', require('./routes/companies'));
app.use('/workings', require('./routes/workings'));
app.use('/jobs', require('./routes/jobs'));

const corsOption = {
    origin: [
        new RegExp(".*://www.104.com.tw"),
        new RegExp(".*://104.com.tw"),
        new RegExp("http://www.1111.com.tw"),
        new RegExp("http://www.518.com.tw"),
        new RegExp(".*://www.yes123.com.tw"),
    ],
};
app.use('/clairvoyance/search', cors(corsOption), require('./routes/clairvoyance/search'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send({
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send({
    message: err.message,
    error: {}
  });
});


module.exports = app;
