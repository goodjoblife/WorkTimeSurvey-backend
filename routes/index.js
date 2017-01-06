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

router.use('/me/permission/search', authentication.cachedFacebookAuthenticationMiddleware);
router.use('/me/permission/search', authorization.cachedSearchPermissionAuthorizationMiddleware);
// Middleware Error Handler
router.use('/me/permission/search', function(err, req, res, next) {
    res.send({hasSearchPermission: false});
});
router.get('/me/permission/search', function(req, res, next) {
    res.send({hasSearchPermission: true});
});

module.exports = router;
