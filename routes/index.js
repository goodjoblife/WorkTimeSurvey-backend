const express = require('express');
const router = express.Router();

const HttpError = require('../libs/errors').HttpError;
const authentication = require('../middlewares/authentication');
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

module.exports = router;
