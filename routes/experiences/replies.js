const winston = require('winston');
const express = require('express');
const HttpError = require('../../libs/errors').HttpError;
const router = express.Router();
const ReplyModel = require('../../models/reply_model');
const authentication = require('../../middlewares/authentication');
const ObjectNotExistError = require('../../libs/errors').ObjectNotExistError;

router.post('/:id/replies', [
    authentication.cachedFacebookAuthenticationMiddleware,
    function(req, res, next) {
        const MAX_CONTENT_SIZE = 1000;
        const user = {
            id: req.user.id,
            type: req.user.type,
        };
        const experience_id = req.params.id;
        const content = req.body.content;
        if (content.length >= MAX_CONTENT_SIZE) {
            next(new HttpError("留言內容請少於1000個字元", 422));
        }

        const reply_model = new ReplyModel(req.db);
        winston.info("/experiences/:id/replies", {
            id: experience_id,
            ip: req.ip,
            ips: req.ips,
            data: req.body,
        });

        reply_model.createReply(experience_id, user, content).then((result) => {
            res.send(result);
        }).catch((err) => {
            if (err instanceof ObjectNotExistError) {
                next(new HttpError(err.message, 404));
            } else {
                next(new HttpError("Internal Server Error", 500));
            }
        });
    },
]);

router.get('/:id/replies', function(req, res, next) {
    res.send('Yo! you are in GET /experiences/:id/replies');
});

module.exports = router;
