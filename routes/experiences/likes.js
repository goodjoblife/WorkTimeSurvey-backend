const express = require('express');
const winston = require('winston');
const router = express.Router();
const LikeModel = require('../../models/like_model');
const authentication = require('../../middlewares/authentication');
const ObjectNotExistError = require('../../libs/errors').ObjectNotExistError;
const HttpError = require('../../libs/errors').HttpError;
const DuplicateKeyError = require('../../libs/errors').DuplicateKeyError;

/**
 * Post /experiences/:id/likes
 * @param {string} req.params.id - experience's id
 * @returns {object}
 *  - {
 *      success : true,
 *  }
 */
router.post('/:id/likes', [
    authentication.cachedFacebookAuthenticationMiddleware,
    function(req, res, next) {
        winston.info(req.originalUrl, {
            ip: req.ip,
            ips: req.ips,
        });

        const user = {
            id: req.user.id,
            type: req.user.type,
        };
        const experience_id = req.params.id;
        const like_model = new LikeModel(req.db);

        like_model.createLikeToExperience(experience_id, user).then((result) => {
            res.send({
                success: true,
            });
        }).catch((err) => {
            if (err instanceof DuplicateKeyError) {
                next(new HttpError(err.message, 403));
            } else if (err instanceof ObjectNotExistError) {
                next(new HttpError(err.message, 404));
            } else {
                next(new HttpError("Internal Server Error", 500));
            }
        });
    },
]);

router.delete('/:id/likes', function(req, res, next) {
    res.send('Yo! you are in DELETE /experiences/:id/likes');
});

module.exports = router;
