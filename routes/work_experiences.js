const express = require('express');
const router = express.Router();
const ExperienceService = require('../services/experience_service');

router.post('/', function(req, res, next) {
    res.send('Yo! you are in POST /work_experiences');
});

module.exports = router;
