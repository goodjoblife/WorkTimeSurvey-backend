const express = require('express');
const router = express.Router();
const HttpError = require('../libs/errors').HttpError;
const winston = require('winston');
const ReplyService = require('./services/replyService');
const authentication = require('../middlewares/authentication');

router.post('/experiences/:id/replies', [
    authentication.cachedFacebookAuthenticationMiddleware,
    function(req, res, next) {
        const user = {
            id: req.user.id,
            type: req.user.type,
        };
        const experienceId = req.params.id;
        const content = req.body.content;
        const replyService = new ReplyService(req.db);
        winston.info("/experiences/:id/replies", {
            id: experienceId,
            ip: req.ip,
            ips: req.ips,
            data: req.body,
        });

        replyService.addReply(experienceId, user, content).then((result) => {
            res.send(result);
        }).catch((err) => {
            next(new HttpError(err, 500));
        });
    },
]);

module.exports = router;
