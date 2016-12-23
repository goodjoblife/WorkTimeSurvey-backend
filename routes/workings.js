const express = require('express');
const router = express.Router();
const HttpError = require('../libs/errors').HttpError;
const facebook = require('../libs/facebook');
const winston = require('winston');
const lodash = require('lodash');
const post_helper = require('./workings_post');

router.get('/sort_by/:SORT_FIELD', function(req, res, next) {
    winston.info('/workings/sort_by/:SORT_FIELD', {query: req.query, ip: req.ip, ips: req.ips});

    // input parameters
    let order = req.query.order || "descending";
    order = (order === "descending") ? -1 : 1;
    const page = parseInt(req.query.page) || 0;
    const limit = 25;

    // preprocess by middleware
    const sort_by = req.sort_by;

    const collection = req.db.collection('workings');
    const query = {};
    const opt = {
        company: 1,
        sector: 1,
        created_at: 1,
        job_title: 1,
        week_work_time: 1,
        overtime_frequency: 1,
        salary: 1,
        estimated_hourly_wage: 1,
        data_time: 1,
    };
    const sort_field = {};
    sort_field[sort_by] = order;

    const data = {};
    collection.find().count().then(function(count) {
        data.total = count;

        return collection.find(query, opt).sort(sort_field).skip(limit * page).limit(limit).toArray();
    }).then(function(results) {
        data.workings = results;

        res.send(data);
    }).catch(function(err) {
        next(new HttpError("Internal Server Error", 500));
    });
});

router.post('/', function(req, res, next) {
    req.custom = {};
    next();
});

/*
 *  When developing, you can set environment to skip facebook auth
 */
if (! process.env.SKIP_FACEBOOK_AUTH) {

    router.post('/', function(req, res, next) {
        var access_token = req.body.access_token;

        facebook.accessTokenAuth(access_token).then(function(facebook) {
            winston.info("facebook auth success", {access_token: access_token, ip: req.ip, ips: req.ips});

            req.custom.facebook = facebook;
            next();
        }).catch(function(err) {
            winston.info("facebook auth fail", {access_token: access_token, ip: req.ip, ips: req.ips});

            next(new HttpError("Unauthorized", 401));
        });
    });

}

router.post('/', (req, res, next) => {
    post_helper.collectData(req, res).then(next, next);
}, (req, res, next) => {
    post_helper.validation(req, res).then(next, next);
}, post_helper.main);

router.get('/search_by/company/group_by/:GROUP_FIELD/group_sort_by/:GROUP_SORT_FIELD', function(req, res, next) {
    winston.info('/workings/search_by/company/group_by/:GROUP_FIELD/group_sort_by/:GROUP_SORT_FIELD', {
        company: req.query.company,
        ip: req.ip,
        ips: req.ips,
    });

    // input parameter
    const company = req.query.company;
    let group_sort_order = req.query.group_sort_order || "descending";
    group_sort_order = (group_sort_order === "descending") ? -1 : 1;

    // preprocess by middleware
    const group_by = req.group_by;
    const group_sort_by = req.group_sort_by;

    // json used in mongodb aggregate
    const project_field = {
        average: {
            $cond: {
                if: true,
                then: {
                    week_work_time: "$avg_week_work_time",
                    estimated_hourly_wage: "$avg_estimated_hourly_wage",
                },
                else: "$skip",
            },
        },
        has_overtime_salary_count: {
            $cond: [
                {$gte: ["$count", 5]},
                {
                    yes: "$has_overtime_salary_yes",
                    no: "$has_overtime_salary_no",
                    "don't know": "$has_overtime_salary_dont",
                },
                "$skip",
            ],
        },
        is_overtime_salary_legal_count: {
            $cond: [
                {$gte: ["$count", 5]},
                {
                    yes: "$is_overtime_salary_legal_yes",
                    no: "$is_overtime_salary_legal_no",
                    "don't know": "$is_overtime_salary_legal_dont",
                },
                "$skip",
            ],
        },
        has_compensatory_dayoff_count: {
            $cond: [
                {$gte: ["$count", 5]},
                {
                    yes: "$has_compensatory_dayoff_yes",
                    no: "$has_compensatory_dayoff_no",
                    "don't know": "$has_compensatory_dayoff_dont",
                },
                "$skip",
            ],
        },
        workings: 1,
        _id: 0,
    };
    project_field[group_by] = "$_id";
    const sort_field = {};
    sort_field[group_sort_by] = group_sort_order;

    const collection = req.db.collection('workings');

    if (! company || company === '') {
        next(new HttpError("job_title is required", 422));
        return;
    }

    collection.aggregate([
        {
            $match: {
                $or: [
                    {'company.name': new RegExp(lodash.escapeRegExp(company.toUpperCase()))},
                    {'company.id': company},
                ],
            },
        },
        {
            $sort: {
                job_title: 1,
            },
        },
        {
            $group: {
                _id: "$"+group_by,
                has_overtime_salary_yes: {$sum:
                    {$cond: [{$eq: ["$has_overtime_salary", "yes"] }, 1, 0] },
                },
                has_overtime_salary_no: {$sum:
                    {$cond: [{$eq: ["$has_overtime_salary", "no"] }, 1, 0] },
                },
                has_overtime_salary_dont: {$sum:
                    {$cond: [{$eq: ["$has_overtime_salary", "don't know"] }, 1, 0] },
                },
                is_overtime_salary_legal_yes: {$sum:
                    {$cond: [{$eq: ["$is_overtime_salary_legal", "yes"] }, 1, 0] },
                },
                is_overtime_salary_legal_no: {$sum:
                    {$cond: [{$eq: ["$is_overtime_salary_legal", "no"] }, 1, 0] },
                },
                is_overtime_salary_legal_dont: {$sum:
                    {$cond: [{$eq: ["$is_overtime_salary_legal", "don't know"] }, 1, 0] },
                },
                has_compensatory_dayoff_yes: {$sum:
                    {$cond: [{$eq: ["$has_compensatory_dayoff", "yes"] }, 1, 0] },
                },
                has_compensatory_dayoff_no: {$sum:
                    {$cond: [{$eq: ["$has_compensatory_dayoff", "no"] }, 1, 0] },
                },
                has_compensatory_dayoff_dont: {$sum:
                    {$cond: [{$eq: ["$has_compensatory_dayoff", "don't know"] }, 1, 0] },
                },
                avg_week_work_time: {
                    $avg: "$week_work_time",
                },
                avg_estimated_hourly_wage: {
                    $avg: "$estimated_hourly_wage",
                },
                workings: {
                    $push: {
                        job_title: "$job_title",
                        week_work_time: "$week_work_time",
                        overtime_frequency: "$overtime_frequency",
                        day_promised_work_time: "$day_promised_work_time",
                        day_real_work_time: "$day_real_work_time",
                        created_at: "$created_at",
                        sector: "$sector",
                        employment_type: "$employment_type",
                        data_time: "$data_time",
                        experience_in_year: "$experience_in_year",
                        salary: "$salary",
                        estimated_hourly_wage: "$estimated_hourly_wage",
                    },
                },
            },
        },
        {
            $project: project_field,
        },
        {
            $sort: sort_field,
        },
    ]).toArray().then(function(results) {
        // if value in average is null, change it to undefined
        for (let each of results) {
            for (let key in each.average) {
                if (each.average[key] === null) {
                    each.average[key] = undefined;
                }
            }
        }

        res.send(results);
    }).catch(function(err) {
        next(new HttpError("Internal Server Error", 500));
    });
});

router.get('/search_by/job_title/group_by/:GROUP_FIELD/group_sort_by/:GROUP_SORT_FIELD', function(req, res, next) {
    winston.info('/workings/search_by/job_title/group_by/:GROUP_FIELD/group_sort_by/:GROUP_SORT_FIELD', {
        job_title: req.query.job_title,
        ip: req.ip,
        ips: req.ips,
    });

    // input parameter
    const job_title = req.query.job_title;
    let group_sort_order = req.query.group_sort_order || "descending";
    group_sort_order = (group_sort_order === "descending") ? -1 : 1;

    // preprocess by middleware
    const group_by = req.group_by;
    const group_sort_by = req.group_sort_by;

    // json used in mongodb aggregate
    const project_field = {
        average: {
            $cond: {
                if: true,
                then: {
                    week_work_time: "$avg_week_work_time",
                    estimated_hourly_wage: "$avg_estimated_hourly_wage",
                },
                else: "$skip",
            },
        },
        workings: 1,
        _id: 0,
    };
    project_field[group_by] = "$_id";
    const sort_field = {};
    sort_field[group_sort_by] = group_sort_order;

    const collection = req.db.collection('workings');

    if (! job_title || job_title === '') {
        next(new HttpError("job_title is required", 422));
        return;
    }

    collection.aggregate([
        {
            $match: {
                job_title: new RegExp(lodash.escapeRegExp(job_title.toUpperCase())),
            },
        },
        {
            $sort: {
                job_title: 1,
            },
        },
        {
            $group: {
                _id: "$"+group_by,
                avg_week_work_time: {
                    $avg: "$week_work_time",
                },
                avg_estimated_hourly_wage: {
                    $avg: "$estimated_hourly_wage",
                },
                workings: {
                    $push: {
                        job_title: "$job_title",
                        week_work_time: "$week_work_time",
                        overtime_frequency: "$overtime_frequency",
                        day_promised_work_time: "$day_promised_work_time",
                        day_real_work_time: "$day_real_work_time",
                        created_at: "$created_at",
                        sector: "$sector",
                        employment_type: "$employment_type",
                        data_time: "$data_time",
                        experience_in_year: "$experience_in_year",
                        salary: "$salary",
                        estimated_hourly_wage: "$estimated_hourly_wage",
                    },
                },
            },
        },
        {
            $project: project_field,
        },
        {
            $sort: sort_field,
        },
    ]).toArray().then(function(results) {
        // if value in average is null, change it to undefined
        for (let each of results) {
            for (let key in each.average) {
                if (each.average[key] === null) {
                    each.average[key] = undefined;
                }
            }
        }

        res.send(results);
    }).catch(function(err) {
        next(new HttpError("Internal Server Error", 500));
    });
});

/**
 * @api {get} /workings/companies/search 搜尋工時資訊中的公司
 * @apiGroup Workings
 * @apiParam {String} key 搜尋關鍵字
 * @apiParam {Number} [page=0] 顯示第幾頁
 * @apiSuccess {Object[]} .
 * @apiSuccess {Object} ._id
 * @apiSuccess {String} ._id.id 公司統編 (有可能沒有)
 * @apiSuccess {String} ._id.name 公司名稱 (有可能是 Array)
 */
router.get('/companies/search', function(req, res, next) {
    winston.info("/workings/companies/search", {query: req.query, ip: req.ip, ips: req.ips});

    const search = req.query.key || "";
    const page = parseInt(req.query.page) || 0;

    if (search === "") {
        throw new HttpError("key is required", 422);
    }

    const collection = req.db.collection('workings');

    collection.aggregate([
        {
            $sort: {
                company: 1,
            },
        },
        {
            $match: {
                $or: [
                    {'company.name': new RegExp(lodash.escapeRegExp(search.toUpperCase()))},
                    {'company.id': search},
                ],
            },
        },
        {
            $group: {
                _id: "$company",
            },
        },
        {
            $limit: 25 * page + 25,
        },
        {
            $skip: 25 * page,
        },
    ]).toArray().then(function(results) {
        res.send(results);
    }).catch(function(err) {
        next(new HttpError("Internal Server Error", 500));
    });
});

/**
 * @api {get} /workings/jobs/search 搜尋工時資訊中的職稱
 * @apiGroup Workings
 * @apiParam {String} key 搜尋關鍵字
 * @apiParam {Number} [page=0] 顯示第幾頁
 * @apiSuccess {Object[]} .
 * @apiSuccess {String} ._id 職稱
 */
router.get('/jobs/search', function(req, res, next) {
    winston.info("/workings/jobs/search", {query: req.query, ip: req.ip, ips: req.ips});

    const search = req.query.key || "";
    const page = parseInt(req.query.page) || 0;

    if (search === "") {
        throw new HttpError("key is required", 422);
    }

    const collection = req.db.collection('workings');

    collection.aggregate([
        {
            $sort: {
                job_title: 1,
            },
        },
        {
            $match: {
                job_title: new RegExp(lodash.escapeRegExp(search.toUpperCase())),
            },
        },
        {
            $group: {
                _id: "$job_title",
            },
        },
        {
            $limit: 25 * page + 25,
        },
        {
            $skip: 25 * page,
        },
    ]).toArray().then(function(results) {
        res.send(results);
    }).catch(function(err) {
        next(new HttpError("Internal Server Error", 500));
    });
});

module.exports = router;
