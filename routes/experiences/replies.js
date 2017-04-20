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

/**
 * @returns {object} - {
 *  replies : [
 *      { id: "abcdefg", content: "hello goodjob", like_count: 10 }
 *      { id: "xxxxxxx", content: "hello mark", like_count: 10 }
 *  ]
 * }
 */
router.get('/:id/replies', function(req, res, next) {
    const experience_id = req.params.id;
    let limit = parseInt(req.query.limit) || 10000;
    let start = parseInt(req.query.start) || 0;

    winston.info("Get /experiences/:id/replies", {
        id: experience_id,
        ip: req.ip,
        ips: req.ips,
    });

    const reply_model = new ReplyModel(req.db);
    reply_model.getRepliesByExperienceId(experience_id, start, limit).then((result) => {
        res.send({
            replies: _repliesModelToApiModel(result),
        });
    }).catch((err) => {
        if (err instanceof ObjectNotExistError) {
            next(new HttpError(err.message, 404));
        } else {
            next(new HttpError("Internal Server Error", 500));
        }
    });
});

function _repliesModelToApiModel(replies) {
    return replies.map((reply) => {
        delete reply.author;
    });
}

module.exports = router;
