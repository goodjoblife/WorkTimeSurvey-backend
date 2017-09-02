const express = require('express');

const router = express.Router();


router.use('/experiences', require('./experiences'));
router.use('/workings', require('./workings'));

module.exports = router;
