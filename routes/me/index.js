const express = require('express');

const router = express.Router();

router.use('/experiences', require('./experiences'));
router.use('/permissions', require('./permissions'));
router.use('/recommendations', require('./recommendations'));
router.use('/replies', require('./replies'));
router.use('/workings', require('./workings'));

module.exports = router;
