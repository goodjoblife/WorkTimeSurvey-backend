const HttpError = require("../../libs/errors").HttpError;
const authenticationLib = require("../../libs/authentication");
const authorizationLib = require("../../libs/authorization");

function pagination(req, res, next) {
    const page = parseInt(req.query.page, 10) || 0;
    const limit = parseInt(req.query.limit, 10) || 25;

    if (isNaN(limit) || limit > 50) {
        next(new HttpError("limit is not allow", 422));
        return;
    }

    req.pagination = {
        page,
        limit,
    };
    next();
}

function checkSearchPermission(req, res, next) {
    const redis_client = req.redis_client;
    const access_token = req.query.access_token;
    req.custom = {};

    if (typeof access_token !== "string") {
        next();
    } else {
        authenticationLib
            .cachedFacebookAuthentication(req.db, redis_client, access_token)
            .then(user => {
                req.user = user;

                const old_user = {
                    id: req.user.facebook_id,
                    type: "facebook",
                };

                return authorizationLib.cachedSearchPermissionAuthorization(
                    req.db,
                    redis_client,
                    old_user
                );
            })
            .then(() => {
                // the client has permission
                req.custom.search_permission = true;
            })
            .then(() => next(), () => next());
    }
}

module.exports = {
    pagination,
    checkSearchPermission,
};
