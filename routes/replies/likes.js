const express = require('express');
const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const DuplicateKeyError = require('../../libs/errors').DuplicateKeyError;
const ObjectNotExistError = require('../../libs/errors').ObjectNotExistError;
const winston = require('winston');
const LikeService = require('../../services/like_service');
const authentication = require('../../middlewares/authentication');

/*
 * When developing, you can set environment to skip facebook auth
 */
if (! process.env.SKIP_FACEBOOK_AUTH) {
    router.post('/:id/likes', authentication.cachedFacebookAuthenticationMiddleware);
}

router.post('/:id/likes', (req, res, next) => {
    winston.info(req.originalUrl, {query: req.query, ip: req.ip, ips: req.ips});

    const id =  req.params.id;
    if (typeof id === 'undefined') {
        next(new HttpError('id error', 422));
        return;
    }

    const author = {};
    if (req.user && req.user.id && req.user.type) {
        author.id = req.user.id;
        author.type = req.user.type;
    } else {
        author.id = "-1";
        author.type = "test";
    }

    const like_service = new LikeService(req.db);

    like_service.createLikeToReply(id, author).then(value => {
        winston.info("user likes a reply successfully", {id: value, ip: req.ip, ips: req.ips});
        res.send({success: true});
    }).catch(reason => {
        if (reason instanceof DuplicateKeyError) {
            next(new HttpError(reason.message, 403));
        } else if (reason instanceof ObjectNotExistError) {
            next(new HttpError(reason.message, 404));
        } else {
            next(new HttpError("Internal Server Error", 500));
        }
    });

});

router.delete('/:id/likes', function(req, res, next) {
    res.send('Yo! you are in DELETE /replies/:id/likes');
});

module.exports = router;
