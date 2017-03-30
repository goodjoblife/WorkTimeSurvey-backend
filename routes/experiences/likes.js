const express = require('express');
const router = express.Router();

router.post('/:id/likes', function(req, res, next) {
    res.send('Yo! you are in POST /experiences/:id/likes');
});

router.delete('/:id/likes', function(req, res, next) {
    res.send('Yo! you are in DELETE /experiences/:id/likes');
});

module.exports = router;
