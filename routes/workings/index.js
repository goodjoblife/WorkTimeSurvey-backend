const express = require("express");
const post_helper = require("./workings_post");
const middleware = require("./middleware");
const WorkingModel = require("../../models/working_model");
const wrap = require("../../libs/wrap");
const { HttpError, ObjectNotExistError } = require("../../libs/errors");
const companiesSearchHandler = require("./companiesSearchHandler");
const jobsSearchHandler = require("./jobsSearchHandler");
const { validSortQuery, pickupSortQuery } = require("./helper");
const {
    requireUserAuthetication,
} = require("../../middlewares/authentication");

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
            .find(defined_query)
            .project(opt)
            .sort(sort)
            .limit(skip)
            .toArray();

        if (defined_results.length < skip) {
            const undefined_results = await collection
                .find(undefined_query)
                .project(opt)
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
            .find(defined_query)
            .project(opt)
            .sort(sort)
            .skip(skip + limit * page)
            .limit(limit)
            .toArray();

        if (defined_results.length < limit) {
            const count_defined_num = await collection
                .find(defined_query)
                .count();

            const undefined_results = await collection
                .find(undefined_query)
                .project(opt)
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
            .find(defined_query)
            .project(opt)
            .sort(sort)
            .skip(skip + limit * page)
            .limit(limit)
            .toArray();

        if (defined_results.length < limit) {
            const count_defined_num = await collection
                .find(defined_query)
                .count();

            const undefined_results = await collection
                .find(undefined_query)
                .project(opt)
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

router.post("/", requireUserAuthetication);
// req.user.facebook --> {id, name}

router.post(
    "/",
    post_helper.collectData,
    post_helper.validation,
    wrap(post_helper.normalizeData),
    wrap(post_helper.main)
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
    requireUserAuthetication,
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
