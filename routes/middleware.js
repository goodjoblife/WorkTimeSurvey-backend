const HttpError = require('../libs/errors').HttpError;

function sort_by(req, res, next) {
    req.sort_by = req.params.SORT_FIELD || 'created_at';

    if (!["created_at", "week_work_time", "estimated_hourly_wage"].includes(req.sort_by)) {
        next(new HttpError('SORT_FIELD error', 422));
        return;
    }
    next();
}

function group_by(req, res, next) {
    req.group_by = req.params.GROUP_FIELD;

    if (!["company", "job_title"].includes(req.group_by)) {
        next(new HttpError('GROUP_FIELD error', 422));
        return;
    }

    next();
}

function group_sort_by(req, res, next) {
    req.group_sort_by = req.params.GROUP_SORT_FIELD || "week_work_time";

    if (req.group_by === undefined) {
        next(new HttpError('group_by is required', 422));
        return;
    } else if (!["week_work_time", "estimated_hourly_wage"].includes(req.group_sort_by)) {
        next(new HttpError('GROUP_SORT_FIELD error', 422));
        return;
    }
    next();
}

// search_by not used
function search_by(req, res, next) {
    req.search_by = req.params.SEARCH_FIELD;

    if (!["company", "job_title"].includes(req.search_by)) {
        next(new HttpError('SEARCH_FIELD error', 422));
        return;
    }
    next();
}

module.exports = {
    sort_by,
    group_by,
    group_sort_by,
    search_by,
};
