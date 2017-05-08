const express = require('express');
const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const DuplicateKeyError = require('../../libs/errors').DuplicateKeyError;
const ObjectNotExistError = require('../../libs/errors').ObjectNotExistError;
const winston = require('winston');
const ReplyLikeModel = require('../../models/reply_like_model');
const ReplyModel = require('../../models/reply_model');
const authentication = require('../../middlewares/authentication');

router.post('/:reply_id/likes', authentication.cachedFacebookAuthenticationMiddleware);
router.post('/:reply_id/likes', (req, res, next) => {
    winston.info(req.originalUrl, {query: req.query, ip: req.ip, ips: req.ips});

    const reply_id =  req.params.reply_id;
    if (typeof reply_id === 'undefined') {
        next(new HttpError('id error', 422));
        return;
    }

    const user = {
        id: req.user.facebook_id,
        type: 'facebook',
    };

    // TODO
    // const user_id = req.user._id;

    const reply_like_model = new ReplyLikeModel(req.db);
    const reply_model = new ReplyModel(req.db);

    reply_like_model.createLike(reply_id, user).then(() =>
        reply_model.incrementLikeCount(reply_id)
    ).then(() => {
        res.send({success: true});
    }).catch(err => {
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

router.delete('/:id/likes', function(req, res, next) {
    res.send('Yo! you are in DELETE /replies/:id/likes');
});

module.exports = router;
