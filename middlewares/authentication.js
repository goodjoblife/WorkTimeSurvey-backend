const authentication = require('../libs/authentication');
const HttpError = require('../libs/errors').HttpError;

function cachedFacebookAuthenticationMiddleware(req, res, next) {
    const db = req.redis_client;
    let access_token;
    // POST or GET
    if (req.headers && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            access_token = parts[1];
        }
    } else if (req.body.access_token !== undefined) {
        access_token = req.body.access_token;
    } else {
        access_token = req.query.access_token;
    }

    if (typeof access_token !== "string") {
        next(new HttpError('Unauthorized', 401));
    } else {
        authentication.cachedFacebookAuthentication(req.db, db, access_token)
            .then(user => {
                req.user = user;
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
