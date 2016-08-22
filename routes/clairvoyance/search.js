const express = require('express');
const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const winston = require('winston');

router.get('/by-job', function(req, res, next) {
    next();
});

router.get('/by-company', function(req, res, next) {
    next();
});

module.exports = router;
