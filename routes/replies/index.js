const express = require('express');
const router = express.Router();

router.use('/', require('./likes'));

module.exports = router;
