const winston = require('winston');
const express = require('express');
const HttpError = require('../../libs/errors').HttpError;
const router = express.Router();
const ReplyService = require('../../services/reply_service');
const authentication = require('../../middlewares/authentication');

router.post('/:id/replies', [
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

router.get('/:id/replies', function(req, res, next) {
    res.send('Yo! you are in GET /experiences/:id/replies');
});

module.exports = router;
