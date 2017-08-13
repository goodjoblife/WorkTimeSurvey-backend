const express = require('express');

const router = express.Router();

const HttpError = require('../libs/errors').HttpError;
const passport = require('passport');
const authorization = require('../middlewares/authorization');
const recommendation = require('../libs/recommendation');

router.post('/me/recommendations', [
    passport.authenticate('bearer', { session: false }),
    (req, res, next) => {
        const old_user = {
            id: req.user.facebook_id,
            type: 'facebook',
        };
        recommendation.getRecommendationString(req.db, old_user).then((recommendation_string) => {
            res.send({
                user: old_user,
                recommendation_string,
            });
        }).catch((err) => {
            next(new HttpError('Internal Server Error', 500));
        });
    },
]);

router.get('/me/permissions/search', [
    passport.authenticate('bearer', { session: false }),
    authorization.cachedSearchPermissionAuthorizationMiddleware,
    // Middleware Error Handler
    (err, req, res, next) => {
        res.send({ hasSearchPermission: false });
    },
    (req, res, next) => {
        res.send({ hasSearchPermission: true });
    },
]);

module.exports = router;
