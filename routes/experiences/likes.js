const express = require('express');
const winston = require('winston');
const router = express.Router();
const ExperienceLikeModel = require('../../models/experience_like_model');
const ExperienceModel = require('../../models/experience_model');
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
        const experience_like_model = new ExperienceLikeModel(req.db);
        const experience_model = new ExperienceModel(req.db);

        experience_like_model.createLike(experience_id, user).then((result) => {
            return experience_model.incrementLikeCount(experience_id);
        }).then((result) => {
            res.send({
                success: true,
            });
        }).catch((err) => {
            winston.info(req.originalUrl, {
                id: experience_id,
                ip: req.ip,
                ips: req.ips,
                err: err.message,
            });

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
