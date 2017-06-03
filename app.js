const bodyParser = require('body-parser');
const compression = require('compression');
const config = require('config');
const cors = require('cors');
const express = require('express');
const expressMongoDb = require('express-mongo-db');
const { HttpError } = require('./libs/errors');
const logger = require('morgan');
const winston = require('winston');
require('winston-mongodb').MongoDB;

const routes = require('./routes/index');

const app = express();

// We are behind the proxy
app.set('trust proxy', 1);

// Enable compress the traffic
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
app.use(expressMongoDb(config.get('MONGODB_URI')));
app.use(require('./middlewares').expressRedisDb(config.get('REDIS_URL')));

app.use(cors({
    origin: [
        /\.goodjob\.life$/,
        'http://localhost:8080',
        'http://localhost:8000',
    ],
}));

app.use((req, res, next) => {
    winston.info(req.originalUrl, {
        ip: req.ip,
        ips: req.ips,
        query: req.query,
    });
    next();
});
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
    next(new HttpError('Not Found', 404));
});

// error handlers

// logging any error except HttpError
app.use((err, req, res, next) => {
    if (err instanceof HttpError) {
        next(err);
        return;
    }

    winston.warn(req.originalUrl, {
        ip: req.ip,
        ips: req.ips,
        message: err.message,
        error: err,
    });

    next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.send({
            message: err.message,
            error: err,
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send({
        message: err.message,
        error: {},
    });
});

module.exports = app;
