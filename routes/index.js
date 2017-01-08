const express = require('express');
const router = express.Router();

const HttpError = require('../libs/errors').HttpError;
const authentication = require('../middlewares/authentication');
const authorization = require('../middlewares/authorization');
const recommendation = require('../libs/recommendation');

router.post('/me/recommendations', [
    authentication.cachedFacebookAuthenticationMiddleware,
    function(req, res, next) {
        const user = {
            id: req.facebook.id,
            type: 'facebook',
        };
        recommendation.getRecommendationString(req.db, user).then(recommendation_string => {
            res.send({
                user: user,
                recommendation_string: recommendation_string,
            });
        }).catch(err => {
            next(new HttpError('Internal Server Error', 500));
        });
    },
]);

router.get('/me/permissions/search', [
    authentication.cachedFacebookAuthenticationMiddleware,
    authorization.cachedSearchPermissionAuthorizationMiddleware,
    // Middleware Error Handler
    function(err, req, res, next) {
        res.send({hasSearchPermission: false});
    },
    function(req, res, next) {
        res.send({hasSearchPermission: true});
    },
]);

module.exports = router;
