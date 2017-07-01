const express = require('express');

const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const DuplicateKeyError = require('../../libs/errors').DuplicateKeyError;
const ObjectNotExistError = require('../../libs/errors').ObjectNotExistError;
const winston = require('winston');
const ReplyLikeModel = require('../../models/reply_like_model');
const ReplyModel = require('../../models/reply_model');
const authentication = require('../../middlewares/authentication');

/**
 * @api {post} /replies/:id/likes 新增留言的讚 API
 * @apiGroup Replies Likes
 * @apiSuccess {Boolean} success 是否成功點讚
 */
router.post('/:reply_id/likes', authentication.cachedFacebookAuthenticationMiddleware);
router.post('/:reply_id/likes', (req, res, next) => {
    winston.info(req.originalUrl, { query: req.query, ip: req.ip, ips: req.ips });

    const reply_id = req.params.reply_id;
    if (typeof reply_id === 'undefined') {
        next(new HttpError('id error', 422));
        return;
    }

    const user = req.user;

    const reply_like_model = new ReplyLikeModel(req.db);
    const reply_model = new ReplyModel(req.db);

    reply_like_model.createLike(reply_id, user).then(() =>
        reply_model.incrementLikeCount(reply_id)
    ).then(() => {
        res.send({ success: true });
    }).catch((err) => {
        if (err instanceof DuplicateKeyError) {
            next(new HttpError(err.message, 403));
            return;
        }

        if (err instanceof ObjectNotExistError) {
            next(new HttpError(err.message, 404));
            return;
        }

        next(new HttpError('Internal Server Error', 500));
    });
});

/**
 * @api {delete} /replies/:id/likes 移除留言的讚 API
 * @apiGroup Replies Likes
 * @apiSuccess {Boolean} success 是否成功取消讚
 */
router.delete('/:reply_id/likes', authentication.cachedFacebookAuthenticationMiddleware);
router.delete('/:reply_id/likes', (req, res, next) => {
    winston.info(req.originalUrl, { query: req.query, ip: req.ip, ips: req.ips });

    const reply_id = req.params.reply_id;
    if (typeof reply_id === 'undefined') {
        next(new HttpError('Not Found', 404));
        return;
    }

    const user = req.user;

    const reply_like_model = new ReplyLikeModel(req.db);
    const reply_model = new ReplyModel(req.db);

    reply_like_model.deleteLike(reply_id, user)
        .then(() => reply_model.decrementLikeCount(reply_id))
        .then(() => {
            res.send({ success: true });
        })
        .catch((err) => {
            if (err instanceof DuplicateKeyError) {
                next(new HttpError(err.message, 403));
                return;
            }

            if (err instanceof ObjectNotExistError) {
                next(new HttpError(err.message, 404));
                return;
            }

            next(new HttpError('Internal Server Error', 500));
        });
});

module.exports = router;
