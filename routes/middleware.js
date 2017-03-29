const HttpError = require('../libs/errors').HttpError;
const authenticationLib = require('../libs/authentication');
const authorizationLib = require('../libs/authorization');

function sort_by(req, res, next) {
    const sort_by = req.query.sort_by || 'created_at';
    let order = req.query.order || "descending";
    order = (order === "descending") ? -1 : 1;

    if (!["created_at", "week_work_time", "estimated_hourly_wage"].includes(sort_by)) {
        next(new HttpError('sort_by error', 422));
        return;
    }

    req.query.sort_by = sort_by;
    req.sort_by = {};
    req.sort_by[sort_by] = order;
    next();
}

function group_sort_by(req, res, next) {
    const group_sort_by = req.query.group_sort_by || "week_work_time";
    let group_sort_order = req.query.group_sort_order || "descending";
    group_sort_order = (group_sort_order === "descending") ? -1 : 1;

    if (!["week_work_time", "estimated_hourly_wage"].includes(group_sort_by)) {
        next(new HttpError('group_sort_by error', 422));
        return;
    }

    req.group_sort_by = {};
    req.group_sort_by["average." + group_sort_by] = group_sort_order;
    next();
}

function pagination(req, res, next) {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 25;

    if (isNaN(limit) || limit > 50) {
        next(new HttpError("limit is not allow", 422));
        return;
    }

    req.pagination = {
        page: page,
        limit: limit,
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
        authenticationLib.cachedFacebookAuthentication(redis_client, access_token)
            .then(account => {
                req.user = {
                    id: account.id,
                    type: 'facebook',
                };
                return authorizationLib.cachedSearchPermissionAuthorization(req.db, redis_client, req.user);
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
