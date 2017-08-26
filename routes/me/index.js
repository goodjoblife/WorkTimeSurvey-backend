const express = require('express');

const router = express.Router();


router.use('/experiences', require('./experiences'));

module.exports = router;
