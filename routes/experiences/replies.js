const winston = require('winston');
const express = require('express');
const HttpError = require('../../libs/errors').HttpError;
const router = express.Router();
const Reply_Service = require('../../services/reply_service');
const authentication = require('../../middlewares/authentication');

router.post('/:id/replies', [
    authentication.cachedFacebookAuthenticationMiddleware,
    function(req, res, next) {
        const user = {
            id: req.user.id,
            type: req.user.type,
        };
        const experience_id = req.params.id;
        const content = req.body.content;
        const reply_service = new Reply_Service(req.db);
        winston.info("/experiences/:id/replies", {
            id: experience_id,
            ip: req.ip,
            ips: req.ips,
            data: req.body,
        });

        reply_service.createReply(experience_id, user, content).then((result) => {
            res.send(result);
        }).catch((err) => {
            if (err.code == 404) {
                next(new HttpError(err.msg, 404));
            } else {
                next(new HttpError(err.msg, 500));
            }
        });
    },
]);

router.get('/:id/replies', function(req, res, next) {
    res.send('Yo! you are in GET /experiences/:id/replies');
});

module.exports = router;
