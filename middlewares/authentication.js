const authentication = require('../libs/authentication');
const HttpError = require('../libs/errors').HttpError;

function cachedFacebookAuthenticationMiddleware(req, res, next) {
    const db = req.redis_client;
    let access_token;
    // POST or GET
    if (req.body.access_token !== undefined) {
        access_token = req.body.access_token;
    } else {
        access_token = req.query.access_token;
    }

    if (typeof access_token !== "string") {
        next(new HttpError('Unauthorized', 401));
    } else {
        authentication.cachedFacebookAuthentication(req.db, db, access_token)
            .then(user => {
                req.user = {
                    id: user.facebook_id,
                    type: 'facebook',
                };
            })
            .then(() => {
                next();
            }, () => {
                next(new HttpError('Unauthorized', 401));
            });
    }
}

module.exports = {
    cachedFacebookAuthenticationMiddleware,
};
