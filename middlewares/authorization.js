const authorization = require('../libs/authorization');
const HttpError = require('../libs/errors').HttpError;

function cachedSearchPermissionAuthorizationMiddleware(req, res, next) {
    const db = req.db;
    const redis_client = req.redis_client;

    if (! req.user) {
        next(new HttpError('Forbidden', 403));
    }

    if (typeof req.user.type !== 'string' || typeof req.user.id !== 'string') {
        next(new HttpError('Forbidden', 403));
    }

    authorization.cachedSearchPermissionAuthorization(db, redis_client, req.user)
        .then(hasPermission => {
            if (hasPermission === true) {
                next();
            } else {
                next(new HttpError('Forbidden', 403));
            }
        }, err => {
            next(new HttpError('Forbidden', 403));
        });
}

module.exports = {
    cachedSearchPermissionAuthorizationMiddleware,
};
