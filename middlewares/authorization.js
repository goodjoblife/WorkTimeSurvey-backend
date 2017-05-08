const authorization = require('../libs/authorization');
const HttpError = require('../libs/errors').HttpError;

function cachedSearchPermissionAuthorizationMiddleware(req, res, next) {
    const db = req.db;
    const redis_client = req.redis_client;

    if (! req.user) {
        next(new HttpError('Forbidden', 403));
    }

    const old_user = {
        id: req.user.facebook_id,
        type: 'facebook',
    };

    authorization.cachedSearchPermissionAuthorization(db, redis_client, old_user)
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
