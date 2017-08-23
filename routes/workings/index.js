const express = require('express');

const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const escapeRegExp = require('lodash/escapeRegExp');
const post_helper = require('./workings_post');
const middleware = require('../middleware');
const passport = require('passport');
const wrap = require('../../libs/wrap');

/* eslint-disable */
/**
 * @api {get} /workings/extreme 查詢薪資工時統計上 1% 外的值
 * @apiGroup Workings
 * @apiParam {String="created_at","week_work_time","estimated_hourly_wage"} [sorted_by="created_at"] 單筆資料排序的方式
 * @apiParam {String="descending","ascending"} [order="descending"] 資料排序由大到小或由小到大。無資料者會被排到最下方
 * @apiSuccess {Object[]} time_and_salary 薪時資料
 */
/* eslint-enable */
router.get('/extreme', middleware.sort_by);
router.get('/extreme', wrap(async (req, res) => {
    const collection = req.db.collection('workings');
    const opt = {
        company: 1,
        sector: 1,
        created_at: 1,
        job_title: 1,
        data_time: 1,
        week_work_time: 1,
        overtime_frequency: 1,
        salary: 1,
        estimated_hourly_wage: 1,
    };

    const data = {};
    const count = await collection.count();

    const defined_query = {
        [req.custom.sort_by]: { $exists: true },
    };
    const undefined_query = {
        [req.custom.sort_by]: { $exists: false },
    };

    const skip = Math.floor(count * 0.01);

    const defined_results = await collection
        .find(defined_query, opt)
        .sort(req.custom.sort)
        .limit(skip)
        .toArray();

    if (defined_results.length < skip) {
        const undefined_results = await collection.find(undefined_query, opt)
            .limit(skip - defined_results.length)
            .toArray();
        data.time_and_salary = defined_results.concat(undefined_results);
    } else {
        data.time_and_salary = defined_results;
    }

    res.send(data);
}));

/* eslint-disable */
/**
 * @api {get} /workings 查詢薪資與工時資料 API
 * @apiGroup Workings
 * @apiParam {String="created_at","week_work_time","estimated_hourly_wage"} [sorted_by="created_at"] 單筆資料排序的方式
 * @apiParam {String="descending","ascending"} [order="descending"] 資料排序由大到小或由小到大。無資料者會被排到最下方
 * @apiParam {String="0"} [page=0] 分頁號碼
 * @apiParam {String="0 < limit <= 50"} [limit=25] 單頁資料筆數
 * @apiSuccess {Number} total 總資料數
 * @apiSuccess {Number} page 目前在資料的第幾頁
 * @apiSuccess {Object[]} time_and_salary 薪時資料
 */
/* eslint-enable */
router.get('/', middleware.sort_by);
router.get('/', middleware.pagination);
router.get('/', wrap(async (req, res) => {
    const collection = req.db.collection('workings');
    const opt = {
        company: 1,
        sector: 1,
        created_at: 1,
        job_title: 1,
        data_time: 1,
        week_work_time: 1,
        overtime_frequency: 1,
        salary: 1,
        estimated_hourly_wage: 1,
    };

    const page = req.pagination.page;
    const limit = req.pagination.limit;
    let is_skip = false;
    if (req.query.skip === 'true') {
        is_skip = true;
    }

    const data = {};
    data.total = await collection.count();

    const defined_query = {
        [req.custom.sort_by]: { $exists: true },
    };
    const undefined_query = {
        [req.custom.sort_by]: { $exists: false },
    };


    let skip = 0;
    if (is_skip === true) {
        skip = Math.floor(data.total * 0.01);
    }

    const defined_results = await collection
        .find(defined_query, opt)
        .sort(req.custom.sort)
        .skip(skip + (limit * page))
        .limit(limit)
        .toArray();

    if (defined_results.length < limit) {
        const count_defined_num = await collection.find(defined_query).count();

        const undefined_results = await collection.find(undefined_query, opt)
            .skip((skip + (limit * page) + defined_results.length) - count_defined_num)
            .limit(limit - defined_results.length)
            .toArray();
        data.time_and_salary = defined_results.concat(undefined_results);
    } else {
        data.time_and_salary = defined_results;
    }

    res.send(data);
}));

router.post('/', (req, res, next) => {
    req.custom = {};
    next();
});

router.post('/', passport.authenticate('bearer', { session: false }));
// req.user.facebook --> {id, name}

router.post('/', (req, res, next) => {
    post_helper.collectData(req, res).then(next, next);
}, (req, res, next) => {
    post_helper.validation(req, res).then(next, next);
}, post_helper.main);

router.use('/search_by/company/group_by/company', middleware.group_sort_by);
router.get('/search_by/company/group_by/company', (req, res, next) => {
    // input parameter
    const company = req.query.company;
    if (!company || company === '') {
        next(new HttpError("company is required", 422));
        return;
    }

    const collection = req.db.collection('workings');
    collection.aggregate([
        {
            $match: {
                $or: [
                    { 'company.name': new RegExp(escapeRegExp(company.toUpperCase())) },
                    { 'company.id': company },
                ],
            },
        },
        {
            $sort: {
                job_title: 1,
                created_at: 1,
            },
        },
        {
            $group: {
                _id: "$company",
                has_overtime_salary_yes: { $sum:
                    { $cond: [{ $eq: ["$has_overtime_salary", "yes"] }, 1, 0] },
                },
                has_overtime_salary_no: { $sum:
                    { $cond: [{ $eq: ["$has_overtime_salary", "no"] }, 1, 0] },
                },
                has_overtime_salary_dont: { $sum:
                    { $cond: [{ $eq: ["$has_overtime_salary", "don't know"] }, 1, 0] },
                },
                is_overtime_salary_legal_yes: { $sum:
                    { $cond: [{ $eq: ["$is_overtime_salary_legal", "yes"] }, 1, 0] },
                },
                is_overtime_salary_legal_no: { $sum:
                    { $cond: [{ $eq: ["$is_overtime_salary_legal", "no"] }, 1, 0] },
                },
                is_overtime_salary_legal_dont: { $sum:
                    { $cond: [{ $eq: ["$is_overtime_salary_legal", "don't know"] }, 1, 0] },
                },
                has_compensatory_dayoff_yes: { $sum:
                    { $cond: [{ $eq: ["$has_compensatory_dayoff", "yes"] }, 1, 0] },
                },
                has_compensatory_dayoff_no: { $sum:
                    { $cond: [{ $eq: ["$has_compensatory_dayoff", "no"] }, 1, 0] },
                },
                has_compensatory_dayoff_dont: { $sum:
                    { $cond: [{ $eq: ["$has_compensatory_dayoff", "don't know"] }, 1, 0] },
                },
                avg_week_work_time: {
                    $avg: "$week_work_time",
                },
                avg_estimated_hourly_wage: {
                    $avg: "$estimated_hourly_wage",
                },
                time_and_salary: {
                    $push: {
                        job_title: "$job_title",
                        sector: "$sector",
                        employment_type: "$employment_type",
                        created_at: "$created_at",
                        data_time: "$data_time",
                        //
                        week_work_time: "$week_work_time",
                        overtime_frequency: "$overtime_frequency",
                        day_promised_work_time: "$day_promised_work_time",
                        day_real_work_time: "$day_real_work_time",
                        //
                        experience_in_year: "$experience_in_year",
                        salary: "$salary",
                        //
                        estimated_hourly_wage: "$estimated_hourly_wage",
                    },
                },
                count: { $sum: 1 },
            },
        },
        {
            $project: {
                average: {
                    week_work_time: "$avg_week_work_time",
                    estimated_hourly_wage: "$avg_estimated_hourly_wage",
                },
                has_overtime_salary_count: {
                    $cond: [
                        { $gte: ["$count", 5] },
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
                        { $gte: ["$count", 5] },
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
                        { $gte: ["$count", 5] },
                        {
                            yes: "$has_compensatory_dayoff_yes",
                            no: "$has_compensatory_dayoff_no",
                            "don't know": "$has_compensatory_dayoff_dont",
                        },
                        "$skip",
                    ],
                },
                time_and_salary: 1,
                _id: 0,
                company: "$_id",
                count: 1,
            },
        },
        {
            $sort: req.group_sort_by,
        },
    ]).toArray().then((results) => {
        const sort_field = req.query.group_sort_by || "week_work_time";

        if (results.length === 0) {
            res.send(results);
            return;
        }

        // move null data to the end of array
        if (results[0].average[sort_field] === null &&
            results[results.length - 1].average[sort_field] !== null) {
            let not_null_idx = 0;
            while (results[not_null_idx].average[sort_field] === null) {
                not_null_idx += 1;
            }

            const nullDatas = results.splice(0, not_null_idx);
            // eslint-disable-next-line no-param-reassign
            results = results.concat(nullDatas);
        }

        res.send(results);
    }).catch((err) => {
        next(err);
    });
});

router.use('/search_by/job_title/group_by/company', middleware.group_sort_by);
router.get('/search_by/job_title/group_by/company', (req, res, next) => {
    // input parameter
    const job_title = req.query.job_title;
    if (!job_title || job_title === '') {
        next(new HttpError("job_title is required", 422));
        return;
    }

    const collection = req.db.collection('workings');

    collection.aggregate([
        {
            $match: {
                job_title: new RegExp(escapeRegExp(job_title.toUpperCase())),
            },
        },
        {
            $sort: {
                job_title: 1,
                created_at: 1,
            },
        },
        {
            $group: {
                _id: "$company",
                avg_week_work_time: {
                    $avg: "$week_work_time",
                },
                avg_estimated_hourly_wage: {
                    $avg: "$estimated_hourly_wage",
                },
                time_and_salary: {
                    $push: {
                        job_title: "$job_title",
                        sector: "$sector",
                        employment_type: "$employment_type",
                        created_at: "$created_at",
                        data_time: "$data_time",
                        //
                        week_work_time: "$week_work_time",
                        overtime_frequency: "$overtime_frequency",
                        day_promised_work_time: "$day_promised_work_time",
                        day_real_work_time: "$day_real_work_time",
                        //
                        experience_in_year: "$experience_in_year",
                        salary: "$salary",
                        //
                        estimated_hourly_wage: "$estimated_hourly_wage",
                    },
                },
            },
        },
        {
            $project: {
                average: {
                    week_work_time: "$avg_week_work_time",
                    estimated_hourly_wage: "$avg_estimated_hourly_wage",
                },
                time_and_salary: 1,
                _id: 0,
                company: "$_id",
            },
        },
        {
            $sort: req.group_sort_by,
        },
    ]).toArray().then((results) => {
        const sort_field = req.query.group_sort_by || "week_work_time";

        if (results.length === 0) {
            res.send(results);
            return;
        }

        // move null data to the end of array
        if (results[0].average[sort_field] === null &&
            results[results.length - 1].average[sort_field] !== null) {
            let not_null_idx = 0;
            while (results[not_null_idx].average[sort_field] === null) {
                not_null_idx += 1;
            }

            const nullDatas = results.splice(0, not_null_idx);
            // eslint-disable-next-line no-param-reassign
            results = results.concat(nullDatas);
        }

        res.send(results);
    }).catch((err) => {
        next(err);
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
router.get('/companies/search', (req, res, next) => {
    const search = req.query.key || "";
    const page = parseInt(req.query.page, 10) || 0;

    if (search === "") {
        next(new HttpError("key is required", 422));
        return;
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
                    { 'company.name': new RegExp(escapeRegExp(search.toUpperCase())) },
                    { 'company.id': search },
                ],
            },
        },
        {
            $group: {
                _id: "$company",
            },
        },
        {
            $limit: (25 * page) + 25,
        },
        {
            $skip: 25 * page,
        },
    ]).toArray().then((results) => {
        res.send(results);
    }).catch((err) => {
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
router.get('/jobs/search', (req, res, next) => {
    const search = req.query.key || "";
    const page = parseInt(req.query.page, 10) || 0;

    if (search === "") {
        next(new HttpError("key is required", 422));
        return;
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
                job_title: new RegExp(escapeRegExp(search.toUpperCase())),
            },
        },
        {
            $group: {
                _id: "$job_title",
            },
        },
        {
            $limit: (25 * page) + 25,
        },
        {
            $skip: 25 * page,
        },
    ]).toArray().then((results) => {
        res.send(results);
    }).catch((err) => {
        next(new HttpError("Internal Server Error", 500));
    });
});

module.exports = router;
