const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
    res.send('Yo! you are in GET /experiences/');
});

router.get('/:id', function(req, res, next) {
    res.send('Yo! you are in GET /experiences/:id');
});

router.use('/', require('./replies'));
router.use('/', require('./likes'));

module.exports = router;
