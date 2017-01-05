const authentication = require('../libs/authentication');
const HttpError = require('../libs/errors').HttpError;

function cachedFacebookAuthenticationMiddleware(req, res, next) {
    const db = req.redis_client;
    const access_token = req.body.access_token;

    if (typeof access_token !== "string") {
        next(new HttpError('Unauthorized', 401));
    } else {
        authentication.cachedFacebookAuthentication(db, access_token)
            .then(account => {
                req.facebook = account;
                req.user = {
                    id: account.id,
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
