const express = require('express');
const router = express.Router();
const HttpError = require('../libs/errors').HttpError;
const facebook = require('../libs/facebook');
const winston = require('winston');
const lodash = require('lodash');

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

/*
 *  When developing, you can set environment to skip facebook auth
 */
if (! process.env.SKIP_FACEBOOK_AUTH) {

    router.post('/', function(req, res, next) {
        var access_token = req.body.access_token;

        facebook.access_token_auth(access_token).then(function(facebook) {
            winston.info("facebook auth success", {access_token: access_token, ip: req.ip, ips: req.ips});

            req.facebook = facebook;
            next();
        }).catch(function(err) {
            winston.info("facebook auth fail", {access_token: access_token, ip: req.ip, ips: req.ips});

            next(new HttpError("Unauthorized", 401));
        });
    });

}

/**
 * @api {post} /workings 新增工時資訊
 * @apiGroup Workings
 * @apiParam {String} access_token FB client auth token
 * @apiParam {String} job_title 職稱
 * @apiParam {Number{0-168}} week_work_time 最近一週總工時
 * @apiParam {Number=1,2,3,4} overtime_frequency 加班頻率
 * @apiParam {Number} day_promised_work_time 工作日表訂工時
 * @apiParam {Number} day_real_work_time 工作日實際平均工時
 * @apiParam {String} [company_id]
 * @apiParam {String} [company] 須跟 company_id 至少有一個
 * @apiParam {String} [email] Email
 * @apiSuccess {Object} .
 */
router.post('/', function(req, res, next) {
    /*
     * Prepare and collect the data from request
     */
    var author = {};

    if (req.body.email && (typeof req.body.email === "string") && req.body.email !== "") {
        author.email = req.body.email;
    }

    if (req.facebook) {
        author.id = req.facebook.id,
        author.name = req.facebook.name,
        author.type = "facebook";
    } else {
        author.id = "-1";
        author.type = "test";
    }

    const working = {
        author: author,
        company: {},
        created_at: new Date(),
    };

    const data = {
        working: working,
    };

    // pick these fields only
    // make sure the field is string
    [
        "job_title", "week_work_time",
        "overtime_frequency",
        "day_promised_work_time", "day_real_work_time",
        "sector",
        "has_overtime_salary",
        "is_overtime_salary_legal",
        "has_compensatory_dayoff",
    ].forEach(function(field, i) {
        if (req.body[field] && (typeof req.body[field] === "string") && req.body[field] !== "") {
            working[field] = req.body[field];
        }
    });
    if (req.body.company_id && (typeof req.body.company_id === "string") && req.body.company_id !== "") {
        working.company.id = req.body.company_id;
    }
    if (req.body.company && (typeof req.body.company === "string") && req.body.company !== "") {
        working.query = req.body.company;
    }

    /*
     * Check all the required fields, or raise an 422 http error
     */
    try {
        validateWorking(working);
    } catch (err) {
        winston.info("validating fail", {id: data._id, ip: req.ip, ips: req.ips});

        next(err);
        return;
    }

    /*
     * Normalize the data
     */
    working.job_title = working.job_title.toUpperCase();

    /*
     * So, here, the data are well-down
     */

    var collection = req.db.collection("workings");
    var companyCollection = req.db.collection("companies");

    // use company id to search company
    function searchCompanyById(id) {
        return companyCollection.find({
            id: id,
        }).toArray();
    }

    // use company name to search company
    function searchCompanyByName(name) {
        return companyCollection.find({
            name: name,
        }).toArray();
    }

    Promise.resolve(data).then(function(data) {
        /*
         * 如果使用者有給定 company id，將 company name 補成查詢到的公司
         *
         * 如果使用者是給定 company name，如果只找到一間公司，才補上 id
         *
         * 其他情況看 issue #7
         */
        const working = data.working;

        if (working.company.id) {
            return searchCompanyById(working.company.id).then(function(results) {
                if (results.length === 0) {
                    throw new HttpError("公司統編不正確", 422);
                }

                working.company.name = results[0].name;
                return data;
            });
        } else {
            return searchCompanyById(working.query).then(function(results) {
                if (results.length === 0) {
                    return searchCompanyByName(working.query.toUpperCase()).then(function(results) {
                        if (results.length === 1) {
                            working.company.id = results[0].id;
                            working.company.name = results[0].name;
                            return data;
                        } else {
                            working.company.name = working.query.toUpperCase();
                            return data;
                        }
                    });
                } else {
                    working.company.id = results[0].id;
                    working.company.name = results[0].name;
                    return data;
                }
            });
        }
    }).then(function(data) {
        const author = data.working.author;

        return checkQuota(req.db, {id: author.id, type: author.type}).then(function(queries_count) {
            data.queries_count = queries_count;

            return data;
        });
    }).then(function(data) {
        return collection.insert(data.working);
    }).then(function(result) {
        winston.info("workings insert data success", {id: data.working._id, ip: req.ip, ips: req.ips});

        res.send(data);
    }).catch(function(err) {
        winston.info("workings insert data fail", {id: data._id, ip: req.ip, ips: req.ips, err: err});

        next(err);
    });
});

function validateWorking(data) {
    if (! data.job_title) {
        throw new HttpError("職稱未填", 422);
    }

    if (! data.week_work_time) {
        throw new HttpError("最近一週實際工時未填", 422);
    }
    data.week_work_time = parseFloat(data.week_work_time);
    if (isNaN(data.week_work_time)) {
        throw new HttpError("最近一週實際工時必須是數字", 422);
    }
    if (data.week_work_time < 0 || data.week_work_time > 168) {
        throw new HttpError("最近一週實際工時必須在0~168之間", 422);
    }

    if (! data.overtime_frequency) {
        throw new HttpError("加班頻率必填", 422);
    }
    if (["0", "1", "2", "3"].indexOf(data.overtime_frequency) === -1) {
        throw new HttpError("加班頻率格式錯誤", 422);
    }
    data.overtime_frequency = parseInt(data.overtime_frequency);

    if (! data.day_promised_work_time) {
        throw new HttpError("工作日表訂工時未填", 422);
    }
    data.day_promised_work_time = parseFloat(data.day_promised_work_time);
    if (isNaN(data.day_promised_work_time)) {
        throw new HttpError("工作日表訂工時必須是數字", 422);
    }
    if (data.day_promised_work_time < 0 || data.day_promised_work_time > 24) {
        throw new HttpError("工作日表訂工時必須在0~24之間", 422);
    }

    if (! data.day_real_work_time) {
        throw new HttpError("工作日實際工時必填", 422);
    }
    data.day_real_work_time = parseFloat(data.day_real_work_time);
    if (isNaN(data.day_real_work_time)) {
        throw new HttpError("工作日實際工時必須是數字", 422);
    }
    if (data.day_real_work_time < 0 || data.day_real_work_time > 24) {
        throw new HttpError("工作日實際工時必須在0~24之間", 422);
    }

    if (! data.company.id) {
        if (! data.query) {
            throw new HttpError("公司/單位名稱必填", 422);
        }
    }

    if (data.has_overtime_salary) {
        if (["yes", "no", "don't know"].indexOf(data.has_overtime_salary) === -1) {
            throw new HttpError('加班是否有加班費應為是/否/不知道', 422);
        }
    }

    if (data.is_overtime_salary_legal) {
        if (data.has_overtime_salary) {
            if (data.has_overtime_salary !== "yes") {
                throw new HttpError('加班應有加班費，本欄位才有意義', 422);
            } else {
                if (["yes", "no", "don't know"].indexOf(data.is_overtime_salary_legal) === -1) {
                    throw new HttpError('加班費是否合法應為是/否/不知道', 422);
                }
            }
        } else {
            throw new HttpError('加班應有加班費，本欄位才有意義', 422);
        }
    }

    if (data.has_compensatory_dayoff) {
        if (["yes", "no", "don't know"].indexOf(data.has_compensatory_dayoff) === -1) {
            throw new HttpError('加班是否有補修應為是/否/不知道', 422);
        }
    }
}

/*
 * Check the quota, limit queries <= 10
 *
 * The quota checker use author as _id
 *
 * @return  Promise
 *
 * Fullfilled with newest queries_count
 * Rejected with HttpError
 */
function checkQuota(db, author) {
    var collection = db.collection('authors');
    var quota = 5;

    return collection.findAndModify(
        {
            _id: author,
            queries_count: {$lt: quota},
        },
        [
        ],
        {
            $inc: { queries_count: 1 },
        },
        {
            upsert: true,
            new: true,
        }
    ).then(function(result) {
        if (result.value.queries_count > quota) {
            throw new HttpError(`您已經上傳${quota}次，已達最高上限`, 429);
        }

        return result.value.queries_count;
    }).catch(function(err) {
        throw new HttpError(`您已經上傳${quota}次，已達最高上限`, 429);
    });

}

/**
 * @api {get} /workings/statistics/by-company Statistics by given company
 * @apiDescription 根據 company 關鍵字，傳回符合關鍵字的公司相關統計資訊
 * @apiGroup Workings
 * @apiParam {String} company
 * @apiSuccess {Object[]} .
 * @apiSuccess {Object} ._id 公司
 * @apiSuccess {String} ._id.id 統一編號（可能沒有）
 * @apiSuccess {String} ._id.name 公司名稱（也可能是 String[]）
 * @apiSuccess {Object[]} .job_titles 以職稱做子分類的資訊
 * @apiSuccess {String} .job_titles._id 職稱名稱
 * @apiSuccess {Number} .job_titles.average_week_work_time 子分類的最近一週工時平均
 * @apiSuccess {Number} .job_titles.count 子分類的資料比數
 *
 * @apiSampleRequest /workings/statistics/by-company?company=YAHOO
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   [
 *     {
 *       "_id": {
 *         "id": "00000000",
 *         "name": "YAHOO!"
 *       },
 *       "job_titles": [
 *         {
 *           "_id": "TEST",
 *           "average_week_work_time": 40,
 *           "count": 1
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
router.get('/statistics/by-company', function(req, res, next) {
    winston.info("/statistics/by-company", {company: req.query.company, ip: req.ip, ips: req.ips});

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
            $group: {
                _id: {company: "$company", job_title: "$job_title"},
                week_work_times: {$push: "$week_work_time"},
                average_week_work_time: {$avg: "$week_work_time"},
                count: {$sum: 1},
            },
        },
        {
            $sort: {
                average_week_work_time: -1,
            },
        },
        {
            $group: {
                _id: "$_id.company",
                job_titles: {$push: {
                    _id: "$_id.job_title",
                    week_work_times: "$week_work_times",
                    average_week_work_time: "$average_week_work_time",
                    count: "$count",
                }},
            },
        },
    ]).toArray().then(function(results) {
        res.send(results);
    }).catch(function(err) {
        next(new HttpError("Internal Server Error", 500));
    });
});


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
                company: -1,
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
