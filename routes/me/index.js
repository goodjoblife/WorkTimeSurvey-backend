const express = require('express');

const router = express.Router();

router.use('/recommendations', require('./recommendations'));
router.use('/permissions', require('./permissions'));

module.exports = router;
