const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
    //
});

router.get('/:id', function(req, res, next) {
    //
});

router.use('/', require('./replies'));
router.use('/', require('./likes'));

module.exports = router;
