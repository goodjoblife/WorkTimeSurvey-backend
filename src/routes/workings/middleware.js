const HttpError = require("../../libs/errors").HttpError;

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

module.exports = {
    pagination,
};
