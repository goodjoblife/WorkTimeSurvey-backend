const winston = require('winston');
const express = require('express');
const HttpError = require('../../libs/errors').HttpError;
const router = express.Router();
const ReplyModel = require('../../models/reply_model');
const ReplyLikeModel = require('../../models/reply_like_model');
const authentication = require('../../middlewares/authentication');
const ObjectNotExistError = require('../../libs/errors').ObjectNotExistError;
const {
    requiredNumberInRange,
} = require('../../libs/validation');

router.post('/:id/replies', [
    authentication.cachedFacebookAuthenticationMiddleware,
    function(req, res, next) {
        const MAX_CONTENT_SIZE = 1000;
        const user = {
            id: req.user.facebook_id,
            type: 'facebook',
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

        const partial_reply = {
            user,
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

router.get('/:id/replies', [
    authentication.cachedFacebookAuthenticationMiddleware,
    function(req, res, next) {
        const experience_id = req.params.id;
        let limit = parseInt(req.query.limit) || 20;
        let start = parseInt(req.query.start) || 0;

        if (!requiredNumberInRange(limit, 1000, 1)) {
            throw new HttpError("limit 格式錯誤", 422);
        }

        winston.info("Get /experiences/:id/replies", {
            id: experience_id,
            ip: req.ip,
            ips: req.ips,
        });
        const user = {
            id: req.user.facebook_id,
            type: 'facebook',
        };

        const reply_model = new ReplyModel(req.db);
        const reply_like_model = new ReplyLikeModel(req.db);
        let result = null;

        reply_model.getRepliesByExperienceId(experience_id, start, limit).then((replies) => {
            result = replies;
            const replies_ids = replies.map(reply => reply._id);
            return reply_like_model.getRepliesLikesByRepliesIds(replies_ids);
        }).then((likes) => {
            _createLikesField(result, likes, user);
            _repliesModelToApiModel(result);
            res.send({
                replies: result,
            });
        }).catch((err) => {
            if (err instanceof ObjectNotExistError) {
                next(new HttpError(err.message, 404));
            } else {
                next(new HttpError("Internal Server Error", 500));
            }
        });
    },
]);

function _createLikesField(replies, likes, user) {
    replies.forEach((reply) => {
        reply.liked = _isExistUserLiked(reply._id, user, likes);
    });
}

function _isExistUserLiked(reply_id, user, likes) {
    const result = likes.find((like) => {
        if (like.reply_id.equals(reply_id) && like.user.id == user.id) {
            return like;
        }
    });
    return (result) ? true : false;
}

function _repliesModelToApiModel(replies) {
    return replies.forEach((reply) => {
        delete reply.author;
    });
}

module.exports = router;
