const winston = require('winston');
const express = require('express');
const HttpError = require('../../libs/errors').HttpError;
const router = express.Router();
const ReplyModel = require('../../models/reply_model');
const authentication = require('../../middlewares/authentication');
const ObjectNotExistError = require('../../libs/errors').ObjectNotExistError;
const {
    requiredNonEmptyString,
    stringRequireLength,
} = require('../../libs/validation');

router.post('/:id/replies', [
    authentication.cachedFacebookAuthenticationMiddleware,
    function(req, res, next) {
        try {
            validationPostFields(req.body);
        } catch (err) {
            next(err);
            return;
        }

        const user = {
            id: req.user.facebook_id,
            type: 'facebook',
        };
        const experience_id = req.params.id;
        // pick fields from post body
        const content = req.body.content;

        const reply_model = new ReplyModel(req.db);
        winston.info("/experiences/:id/replies", {
            id: experience_id,
            ip: req.ip,
            ips: req.ips,
            data: req.body,
        });

        const partial_reply = {
            author: user,
            content,
        };

        reply_model.createReply(experience_id, partial_reply).then((reply) => {
            // 事實上 reply === partial_reply
            const result = {
                reply,
            };

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

const MAX_CONTENT_SIZE = 1000;
function validationPostFields(body) {
    if (!requiredNonEmptyString(body.content)) {
        throw new HttpError("留言內容必填！", 422);
    }
    if (!stringRequireLength(body.content, 1, MAX_CONTENT_SIZE)) {
        throw new HttpError("留言內容請少於 1000 個字元", 422);
    }
}

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
