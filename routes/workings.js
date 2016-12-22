const express = require('express');
const router = express.Router();
const HttpError = require('../libs/errors').HttpError;
const facebook = require('../libs/facebook');
const winston = require('winston');
const lodash = require('lodash');
const helper = require('./workings_helper');

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

/*
 *  When developing, you can set environment to skip facebook auth
 */
if (! process.env.SKIP_FACEBOOK_AUTH) {

    router.post('/', function(req, res, next) {
        var access_token = req.body.access_token;

        facebook.accessTokenAuth(access_token).then(function(facebook) {
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

    const collection = req.db.collection("workings");

    Promise.resolve(data).then(function(data) {
        /*
         * 如果使用者有給定 company id，將 company name 補成查詢到的公司
         *
         * 如果使用者是給定 company name，如果只找到一間公司，才補上 id
         *
         * 其他情況看 issue #7
         */
        const working = data.working;

        return helper.normalizeCompany(req.db, working.company.id, working.query).then(company => {
            working.company = company;

            return data;
        });
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
