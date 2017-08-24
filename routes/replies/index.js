const express = require('express');

const router = express.Router();

router.use('/', require('./likes'));
router.use('/', require('./reports'));

module.exports = router;
