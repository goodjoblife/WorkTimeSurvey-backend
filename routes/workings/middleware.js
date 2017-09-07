const HttpError = require("../../libs/errors").HttpError;
const authenticationLib = require("../../libs/authentication");
const authorizationLib = require("../../libs/authorization");

function sort_by(req, res, next) {
    const _sort_by = req.query.sort_by || "created_at";
    let order = req.query.order || "descending";
    order = order === "descending" ? -1 : 1;

    if (
        !["created_at", "week_work_time", "estimated_hourly_wage"].includes(
            _sort_by
        )
    ) {
        next(new HttpError("sort_by error", 422));
        return;
    }

    if (!req.custom) {
        req.custom = {};
    }

    req.custom.sort = {
        [_sort_by]: order,
    };
    req.custom.sort_by = _sort_by;
    next();
}

function group_sort_by(req, res, next) {
    const _group_sort_by = req.query.group_sort_by || "week_work_time";
    let group_sort_order = req.query.group_sort_order || "descending";
    group_sort_order = group_sort_order === "descending" ? -1 : 1;

    if (!["week_work_time", "estimated_hourly_wage"].includes(_group_sort_by)) {
        next(new HttpError("group_sort_by error", 422));
        return;
    }

    req.group_sort_by = {};
    req.group_sort_by[`average.${_group_sort_by}`] = group_sort_order;
    next();
}

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
    sort_by,
    group_sort_by,
    pagination,
    checkSearchPermission,
};
