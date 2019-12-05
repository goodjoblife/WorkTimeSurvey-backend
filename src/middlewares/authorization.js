const authorization = require("../libs/authorization");
const HttpError = require("../libs/errors").HttpError;

function cachedSearchPermissionAuthorizationMiddleware(req, res, next) {
    const db = req.db;
    const redis_client = req.redis_client;

    if (!req.user) {
        next(new HttpError("Forbidden", 403));
    }

    const user_id = req.user._id;

    authorization
        .cachedSearchPermissionAuthorization(db, redis_client, user_id)
        .then(
            hasPermission => {
                if (hasPermission === true) {
                    next();
                } else {
                    next(new HttpError("Forbidden", 403));
                }
            },
            () => {
                next(new HttpError("Forbidden", 403));
            }
        );
}

module.exports = {
    cachedSearchPermissionAuthorizationMiddleware,
};
