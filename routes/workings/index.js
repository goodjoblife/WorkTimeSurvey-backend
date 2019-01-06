const express = require("express");
const passport = require("passport");
const escapeRegExp = require("lodash/escapeRegExp");

const post_helper = require("./workings_post");
const middleware = require("./middleware");
const WorkingModel = require("../../models/working_model");
const wrap = require("../../libs/wrap");
const { HttpError, ObjectNotExistError } = require("../../libs/errors");
const companiesSearchHandler = require("./companiesSearchHandler");
const jobsSearchHandler = require("./jobsSearchHandler");
const {
    validSortQuery,
    pickupSortQuery,
    validGroupSortQuery,
    pickupGroupSortQuery,
} = require("./helper");

const router = express.Router();

/* eslint-disable */
/**
 * @api {get} /workings/extreme 查詢薪資工時統計上 1% 外的值
 * @apiGroup Workings
 * @apiParam {String="created_at","week_work_time","estimated_hourly_wage"} [sorted_by="created_at"] 單筆資料排序的方式
 * @apiParam {String="descending","ascending"} [order="descending"] 資料排序由大到小或由小到大。無資料者會被排到最下方
 * @apiSuccess {Object[]} time_and_salary 薪時資料
 */
/* eslint-enable */
router.get(
    "/extreme",
    wrap(async (req, res) => {
        validSortQuery(req.query);
        const { sort, sort_by } = pickupSortQuery(req.query);

        const collection = req.db.collection("workings");
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
            about_this_job: 1,
        };
        const base_query = {
            status: "published",
            "archive.is_archived": false,
        };

        const data = {};
        const count = await collection.find(base_query).count();

        const defined_query = {
            [sort_by]: { $exists: true },
            ...base_query,
        };
        const undefined_query = {
            [sort_by]: { $exists: false },
            ...base_query,
        };

        const skip = Math.floor(count * 0.01);

        const defined_results = await collection
            .find(defined_query, opt)
            .sort(sort)
            .limit(skip)
            .toArray();

        if (defined_results.length < skip) {
            const undefined_results = await collection
                .find(undefined_query, opt)
                .limit(skip - defined_results.length)
                .toArray();
            data.time_and_salary = defined_results.concat(undefined_results);
        } else {
            data.time_and_salary = defined_results;
        }

        res.send(data);
    })
);

/* eslint-disable */
/**
 * @api {get} /workings 查詢薪資與工時資料 API
 * @apiGroup Workings
 * @apiParam {String="created_at","week_work_time","estimated_hourly_wage"} [sorted_by="created_at"] 單筆資料排序的方式
 * @apiParam {String="descending","ascending"} [order="descending"] 資料排序由大到小或由小到大。無資料者會被排到最下方
 * @apiParam {String="0"} [page=0] 分頁號碼
 * @apiParam {String="0 < limit <= 50"} [limit=25] 單頁資料筆數
 * @apiSuccess {Number} total 總資料數
 * @apiSuccess {Object[]} time_and_salary 薪時資料
 */
/* eslint-enable */
router.get("/", middleware.pagination);
router.get(
    "/",
    wrap(async (req, res) => {
        validSortQuery(req.query);
        const { sort, sort_by } = pickupSortQuery(req.query);

        const collection = req.db.collection("workings");
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
            about_this_job: 1,
        };

        const page = req.pagination.page;
        const limit = req.pagination.limit;

        const base_query = {
            status: "published",
            "archive.is_archived": false,
        };

        const data = {
            total: await collection.find(base_query).count(),
        };

        const defined_query = {
            [sort_by]: { $exists: true },
            ...base_query,
        };
        const undefined_query = {
            [sort_by]: { $exists: false },
            ...base_query,
        };

        const skip =
            req.query.skip === "true" ? Math.floor(data.total * 0.01) : 0;

        const defined_results = await collection
            .find(defined_query, opt)
            .sort(sort)
            .skip(skip + limit * page)
            .limit(limit)
            .toArray();

        if (defined_results.length < limit) {
            const count_defined_num = await collection
                .find(defined_query)
                .count();

            const undefined_results = await collection
                .find(undefined_query, opt)
                .skip(
                    skip +
                        limit * page +
                        defined_results.length -
                        count_defined_num
                )
                .limit(limit - defined_results.length)
                .toArray();
            data.time_and_salary = defined_results.concat(undefined_results);
        } else {
            data.time_and_salary = defined_results;
        }

        res.send(data);
    })
);

/* eslint-disable */
/**
 * @api {get} /campaigns/:campaign_name 查詢 campaign_name 薪資與工時資料 API
 * @apiGroup Workings
 * @apiParam {String="created_at","week_work_time","estimated_hourly_wage"} [sorted_by="created_at"] 單筆資料排序的方式
 * @apiParam {String="descending","ascending"} [order="descending"] 資料排序由大到小或由小到大。無資料者會被排到最下方
 * @apiParam {String="0"} [page=0] 分頁號碼
 * @apiParam {String="0 < limit <= 50"} [limit=25] 單頁資料筆數
 * @apiParam {String[]} [job_titles] 要搜尋的職稱
 * @apiSuccess {Number} total 總資料數
 * @apiSuccess {Object[]} time_and_salary 薪時資料
 */
/* eslint-enable */
router.get("/campaigns/:campaign_name", middleware.pagination);
router.get(
    "/campaigns/:campaign_name",
    wrap(async (req, res) => {
        validSortQuery(req.query);
        const { sort, sort_by } = pickupSortQuery(req.query);

        const collection = req.db.collection("workings");
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
            campaign_name: 1,
            about_this_job: 1,
        };

        const { page, limit } = req.pagination;
        let job_titles = req.query.job_titles;
        const campaign_name = req.params.campaign_name;

        if (job_titles) {
            if (!Array.isArray(job_titles)) {
                throw new HttpError(
                    "job_titles should be array, you should send through job_titles[]=xx",
                    422
                );
            }
            if (!job_titles.every(e => typeof e === "string")) {
                throw new HttpError(
                    "job_titles need to be array of string",
                    422
                );
            }
        }

        let base_query = {
            status: "published",
            "archive.is_archived": false,
            campaign_name,
        };
        if (job_titles) {
            job_titles = job_titles.map(e => e.toUpperCase());
            base_query = {
                $or: [base_query, { job_title: { $in: job_titles } }],
            };
        }
        const data = {
            total: await collection.find(base_query).count(),
        };

        const defined_query = {
            [sort_by]: { $exists: true },
            ...base_query,
        };
        const undefined_query = {
            [sort_by]: { $exists: false },
            ...base_query,
        };

        const skip =
            req.query.skip === "true" ? Math.floor(data.total * 0.01) : 0;

        const defined_results = await collection
            .find(defined_query, opt)
            .sort(sort)
            .skip(skip + limit * page)
            .limit(limit)
            .toArray();

        if (defined_results.length < limit) {
            const count_defined_num = await collection
                .find(defined_query)
                .count();

            const undefined_results = await collection
                .find(undefined_query, opt)
                .skip(
                    skip +
                        limit * page +
                        defined_results.length -
                        count_defined_num
                )
                .limit(limit - defined_results.length)
                .toArray();
            data.time_and_salary = defined_results.concat(undefined_results);
        } else {
            data.time_and_salary = defined_results;
        }

        res.send(data);
    })
);

router.post("/", (req, res, next) => {
    req.custom = {};
    next();
});

router.post("/", passport.authenticate("bearer", { session: false }));
// req.user.facebook --> {id, name}

router.post(
    "/",
    post_helper.collectData,
    post_helper.validation,
    wrap(post_helper.normalizeData),
    wrap(post_helper.main)
);

router.get(
    "/search_by/company/group_by/company",
    wrap(async (req, res) => {
        // input parameter
        validGroupSortQuery(req.query);
        const { skip_sort, group_sort, group_sort_by } = pickupGroupSortQuery(
            req.query
        );
        const company = req.query.company;
        if (!company || company === "") {
            throw new HttpError("company is required", 422);
        }

        const collection = req.db.collection("workings");
        const count = await collection
            .find({
                status: "published",
                "archive.is_archived": false,
            })
            .count();
        const skip = Math.floor(count * 0.01);

        let results = await collection
            .aggregate([
                {
                    $match: {
                        status: "published",
                        "archive.is_archived": false,
                    },
                },
                { $sort: skip_sort },
                { $skip: skip },
                {
                    $match: {
                        $or: [
                            {
                                "company.name": new RegExp(
                                    escapeRegExp(company.toUpperCase())
                                ),
                            },
                            { "company.id": company },
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
                        has_overtime_salary_yes: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$has_overtime_salary", "yes"] },
                                    1,
                                    0,
                                ],
                            },
                        },
                        has_overtime_salary_no: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$has_overtime_salary", "no"] },
                                    1,
                                    0,
                                ],
                            },
                        },
                        has_overtime_salary_dont: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            "$has_overtime_salary",
                                            "don't know",
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        is_overtime_salary_legal_yes: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            "$is_overtime_salary_legal",
                                            "yes",
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        is_overtime_salary_legal_no: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            "$is_overtime_salary_legal",
                                            "no",
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        is_overtime_salary_legal_dont: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            "$is_overtime_salary_legal",
                                            "don't know",
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        has_compensatory_dayoff_yes: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            "$has_compensatory_dayoff",
                                            "yes",
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        has_compensatory_dayoff_no: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$has_compensatory_dayoff", "no"] },
                                    1,
                                    0,
                                ],
                            },
                        },
                        has_compensatory_dayoff_dont: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            "$has_compensatory_dayoff",
                                            "don't know",
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
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
                                day_promised_work_time:
                                    "$day_promised_work_time",
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
                                    "don't know":
                                        "$is_overtime_salary_legal_dont",
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
                                    "don't know":
                                        "$has_compensatory_dayoff_dont",
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
                    $sort: group_sort,
                },
            ])
            .toArray();

        if (results.length === 0) {
            res.send(results);
            return;
        }

        // move null data to the end of array
        if (
            results[0].average[group_sort_by] === null &&
            results[results.length - 1].average[group_sort_by] !== null
        ) {
            let not_null_idx = 0;
            while (results[not_null_idx].average[group_sort_by] === null) {
                not_null_idx += 1;
            }

            const nullDatas = results.splice(0, not_null_idx);
            // eslint-disable-next-line no-param-reassign
            results = results.concat(nullDatas);
        }

        res.send(results);
    })
);

router.get(
    "/search_by/job_title/group_by/company",
    wrap(async (req, res) => {
        // input parameter
        validGroupSortQuery(req.query);
        const { skip_sort, group_sort, group_sort_by } = pickupGroupSortQuery(
            req.query
        );
        const job_title = req.query.job_title;
        if (!job_title || job_title === "") {
            throw new HttpError("job_title is required", 422);
        }

        const collection = req.db.collection("workings");
        const count = await collection
            .find({
                status: "published",
                "archive.is_archived": false,
            })
            .count();
        const skip = Math.floor(count * 0.01);

        let results = await collection
            .aggregate([
                {
                    $match: {
                        status: "published",
                        "archive.is_archived": false,
                    },
                },
                { $sort: skip_sort },
                { $skip: skip },
                {
                    $match: {
                        job_title: new RegExp(
                            escapeRegExp(job_title.toUpperCase())
                        ),
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
                                day_promised_work_time:
                                    "$day_promised_work_time",
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
                    $sort: group_sort,
                },
            ])
            .toArray();

        if (results.length === 0) {
            res.send(results);
            return;
        }

        // move null data to the end of array
        if (
            results[0].average[group_sort_by] === null &&
            results[results.length - 1].average[group_sort_by] !== null
        ) {
            let not_null_idx = 0;
            while (results[not_null_idx].average[group_sort_by] === null) {
                not_null_idx += 1;
            }

            const nullDatas = results.splice(0, not_null_idx);
            // eslint-disable-next-line no-param-reassign
            results = results.concat(nullDatas);
        }

        res.send(results);
    })
);

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
router.get("/companies/search", companiesSearchHandler);

/**
 * @api {get} /workings/jobs/search 搜尋工時資訊中的職稱
 * @apiGroup Workings
 * @apiParam {String} key 搜尋關鍵字
 * @apiParam {Number} [page=0] 顯示第幾頁
 * @apiSuccess {Object[]} .
 * @apiSuccess {String} ._id 職稱
 */
router.get("/jobs/search", jobsSearchHandler);

function _isValidStatus(value) {
    const valid_status = ["published", "hidden"];
    return valid_status.indexOf(value) > -1;
}

/**
 * @api {patch} /workings/:id 更新自已建立的工時與薪資狀態 API
 * @apiParam {String="published","hidden"} status 要更新成的狀態
 * @apiGroup Workings
 * @apiSuccess {Boolean} success 是否更新狀態成功
 * @apiSuccess {String} status 更新後狀態
 */
router.patch("/:id", [
    passport.authenticate("bearer", { session: false }),
    wrap(async (req, res) => {
        const id = req.params.id;
        const status = req.body.status;
        const user = req.user;

        if (!_isValidStatus(status)) {
            throw new HttpError("status is invalid", 422);
        }

        const working_model = new WorkingModel(req.db);
        let working;
        try {
            working = await working_model.getWorkingsById(id, { author: 1 });
        } catch (err) {
            if (err instanceof ObjectNotExistError) {
                throw new HttpError(err.message, 404);
            }
            throw err;
        }

        if (!(working.author.id === user.facebook_id)) {
            throw new HttpError("user is unauthorized", 403);
        }

        const result = await working_model.updateStatus(id, status);
        res.send({
            success: true,
            status: result.value.status,
        });
    }),
]);

module.exports = router;
