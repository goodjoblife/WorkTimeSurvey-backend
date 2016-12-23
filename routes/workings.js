const express = require('express');
const router = express.Router();
const HttpError = require('../libs/errors').HttpError;
const facebook = require('../libs/facebook');
const winston = require('winston');
const lodash = require('lodash');
const post_helper = require('./workings_post');

/**
 * @api {get} /workings/latest 最新工時資訊
 * @apiGroup Workings
 * @apiParam {Number} [page=0] 頁碼，從 0 開始
 * @apiParam {Number} [limit=25] 每頁數量，最大值 50
 * @apiSuccess {Number} total 總計數量
 * @apiSuccess {Object[]} workings 資料集
 */
router.get('/latest', function(req, res, next) {
    winston.info("/workings/latest", {query: req.query, ip: req.ip, ips: req.ips});

    var page = req.query.page || 0;
    var limit = req.query.limit || 25;

    limit = parseInt(limit);
    if (isNaN(limit) || limit > 50) {
        throw new HttpError("limit is not allow");
    }

    var collection = req.db.collection('workings');
    var q = {};
    var opt = {
        company: 1,
        week_work_time: 1,
        job_title: 1,
        overtime_frequency: 1,
        sector: 1,
        created_at: 1,
    };

    const data = {};

    collection.find().count().then(function(count) {
        data.total = count;

        return collection.find(q, opt).sort({created_at: -1}).skip(limit * page).limit(limit).toArray();
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

/**
 * @api {get} /workings/search-and-group/by-company search by given company
 * @apiDescription 根據 company 關鍵字，傳回符合關鍵字的公司相關統計資訊
 * @apiGroup Workings
 * @apiParam {String} company
 * @apiSuccess {Object[]} .
 * @apiSuccess {Object} ._id 公司
 * @apiSuccess {String} ._id.id 統一編號（可能沒有）
 * @apiSuccess {String} ._id.name 公司名稱（也可能是 String[]）
 * @apiSuccess {Object[]} .workings _id match company 的所有資料
 * @apiSuccess {String} .workings.job_title 職稱名稱
 * @apiSuccess {Number} .workings.week_work_time 該比資料一週工時
 * @apiSuccess {Number} .workings.overtime_frequency 該比資料加班頻率
 * @apiSuccess {Number} .workings.day_promised_work_time 該比資料工作日表訂工時
 * @apiSuccess {Number} .workings.day_real_work_time 該比資料工作日實際工時
 * @apiSuccess {String} .workings.created_at 該比資料填寫完成時間 it is a String with date format
 * @apiSuccess {String} .workings.sector 該比資料廠區/門市/分公司
 * @apiSuccess {Object[]} has_overtime_salary_count 統計該公司是否有加班費 (may be undefined)
 * @apiSuccess {Object[]} is_overtime_salary_legal_count 統計該公司加班費是否合法 (may be undefined)
 * @apiSuccess {Object[]} has_compensatory_dayoff_count 統計該公司是否有補休 (may be undefined)
 * @apiSuccess {Number} .count workings 的資料比數
 *
 * @apiSampleRequest /workings/search-and-group/by-company?company=COMPANY1
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   [
 *     {
 *       _id: { id: '84149961', name: 'COMPANY1' },
 *       workings: [
 *         {
 *           job_title: 'ENGINEER2',
 *           week_work_time: 45,
 *           overtime_frequency: 1,
 *           day_promised_work_time: 9,
 *           day_real_work_time: 10,
 *           created_at: '2016-07-23T14:15:44.929Z',
 *           sector: 'TAIPEI'
 *         },
 *         ...
 *       ],
 *       has_overtime_salary: { yes: 3, no: 1, dont_know: 1 },
 *       is_overtime_salary_legal: { yes: 1, no: 1, dont_know: 1 },
 *       has_compensatory_dayoff: { yes: 2, no: 2, dont_know: 1 },
 *       count: 5,
 *     }
 *   ]
 * }
 */
router.get('/search-and-group/by-company', function(req, res, next) {
    winston.info("/workings/search-and-group/by-company", {company: req.query.company, ip: req.ip, ips: req.ips});

    const company = req.query.company;
    const collection = req.db.collection('workings');

    if (! company || company === '') {
        next(new HttpError("company is required", 422));
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
                _id: "$company",
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
                workings: {
                    $push: {
                        job_title: "$job_title",
                        week_work_time: "$week_work_time",
                        overtime_frequency: "$overtime_frequency",
                        day_promised_work_time: "$day_promised_work_time",
                        day_real_work_time: "$day_real_work_time",
                        created_at: "$created_at",
                        sector: "$sector",
                    },
                },
                count: {$sum: 1},
            },
        },
        {
            $project: {
                _id: 1,
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
                count: 1,
            },
        },
        {
            $sort: {
                count: -1,
                _id: 1,
            },
        },
    ]).toArray().then(function(results) {
        res.send(results);
    }).catch(function(err) {
        next(new HttpError("Internal Server Error", 500));
    });
});

/**
 * @api {get} /workings/search-and-group/by-job-title search by given job_title
 * @apiGroup Workings
 * @apiParam {String} job_title
 * @apiSuccess {Object[]} .
 * @apiSuccess {Object} ._id 職稱名稱
 * @apiSuccess {Number} .count 工時數量
 * @apiSuccess {Object[]} .workings[] 工時資料
 * @apiSuccess {Object} .workings.company 公司
 * @apiSuccess {Number} .workings.week_work_time
 * @apiSuccess {Number} .workings.overtime_frequency
 * @apiSuccess {Number} .workings.day_promised_work_time
 * @apiSuccess {Number} .workings.day_real_work_time
 * @apiSuccess {String} .workings.created_at
 * @apiSuccess {String} .workings.sector
 */
router.get('/search-and-group/by-job-title', function(req, res, next) {
    winston.info("/workings/search-and-group/by-job-title", {job_title: req.query.job_title, ip: req.ip, ips: req.ips});

    const job_title = req.query.job_title;
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
                company: 1,
            },
        },
        {
            $group: {
                _id: "$job_title",
                workings: {
                    $push: {
                        company: "$company",
                        week_work_time: "$week_work_time",
                        overtime_frequency: "$overtime_frequency",
                        day_promised_work_time: "$day_promised_work_time",
                        day_real_work_time: "$day_real_work_time",
                        created_at: "$created_at",
                        sector: "$sector",
                    },
                },
                count: {
                    $sum: 1,
                },
            },
        },
        {
            $sort: {
                count: -1,
                _id: 1,
            },
        },
    ]).toArray().then(function(results) {
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
