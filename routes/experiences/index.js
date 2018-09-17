const express = require("express");
const R = require("ramda");

const router = express.Router();
const HttpError = require("../../libs/errors").HttpError;
const escapeRegExp = require("lodash/escapeRegExp");
const { ensureToObjectId } = require("../../models");
const ExperienceModel = require("../../models/experience_model");
const ExperienceLikeModel = require("../../models/experience_like_model");
const {
    requiredNumberInRange,
    requiredNumberGreaterThanOrEqualTo,
    shouldIn,
} = require("../../libs/validation");
const passport = require("passport");
const { semiAuthentication } = require("../../middlewares/authentication");
const wrap = require("../../libs/wrap");
const { experiencesView } = require("../../view_models/get_experiences");
const { experienceView } = require("../../view_models/get_experience");

/**
 * paramter to DB query object
 *
 * @param {string} search_query - search text
 * @param {string} search_by - "company" / "job_title"
 * @param {string} type - "interview" / "work"
 * @returns {object} - mongodb find object
 */
function _queryToDBQuery(search_query, search_by, type) {
    const query = {
        status: "published",
    };

    if (search_by === "job_title") {
        query.job_title = new RegExp(escapeRegExp(search_query.toUpperCase()));
    } else if (search_by === "company") {
        query.$or = [
            {
                "company.name": new RegExp(
                    escapeRegExp(search_query.toUpperCase())
                ),
            },
            {
                "company.id": search_query,
            },
        ];
    } else {
        // not search, just list
    }

    if (type) {
        const types = type.split(",");
        if (types.length === 1) {
            query.type = types[0];
        } else {
            query.type = {
                $in: types,
            };
        }
    } else {
        // all types is returned;
    }

    return query;
}

function _keywordFactory(type, manager) {
    if (type === "company") {
        return manager.CompanyKeywordModel;
    } else if (type === "job_title") {
        return manager.JobTitleKeywordModel;
    }
}

function _saveKeyWord(query, type, manager) {
    if (!query) {
        return;
    }

    const keyword_model = _keywordFactory(type, manager);
    return keyword_model.createKeyword(query);
}

function validateGetExperiencesInput(req) {
    const {
        // optional
        search_query,
        search_by,
        sort,
        start,
        limit,
    } = req.query;

    if (search_query) {
        if (!search_by) {
            throw new HttpError("search_by 不能為空", 422);
        }
        if (!shouldIn(search_by, ["company", "job_title"])) {
            throw new HttpError("search_by 格式錯誤", 422);
        }
    }

    if (sort) {
        if (!shouldIn(sort, ["created_at", "popularity"])) {
            throw new HttpError("sort 格式錯誤", 422);
        }
    }

    if (start) {
        if (!requiredNumberGreaterThanOrEqualTo(parseInt(start, 10), 0)) {
            throw new HttpError("start 格式錯誤", 422);
        }
    }

    if (limit) {
        if (!requiredNumberInRange(parseInt(limit), 1, 100)) {
            throw new HttpError("limit 格式錯誤", 422);
        }
    }
}

/* eslint-disable */
/**
 * @api {get} /experiences 查詢面試及工作經驗 API
 * @apiGroup Experiences
 * @apiParam {String} [search_query] 搜尋字串
 * @apiParam {String="company","job_title"} [search_by="company"]  選擇以公司 or 職稱搜尋
 * @apiParam {String="created_at","popularity"} [sort = “created_at"]  排序方式。最新 or 熱門經驗
 * @apiParam {Number="0 <= start "} [start = 0] 從第 start + 1 筆資料開始
 * @apiParam {String="0 < limit <=100 "} [limit = 20] 最多回傳limit筆資料
 * @apiParam {String="interview","work","interview,work"} [type = “interview,work”] 搜尋的種類
 * @apiSuccess {Number} total 總資料數
 * @apiSuccess {Object[]} experiences 經驗資料
 * @apiSuccess {String} experiences._id 經驗分享 id
 * @apiSuccess {String="interview","work"} experiences.type 經驗類別
 * @apiSuccess {String} experiences.created_at 資料填寫時間
 * @apiSuccess {Object} experiences.company 公司
 * @apiSuccess {String} [experiences.company.id] 公司統編
 * @apiSuccess {String} experiences.company.name 公司名稱
 * @apiSuccess {String} experiences.job_title 職稱
 * @apiSuccess {String} experiences.title 標題
 * @apiSuccess {string} experiences.preview 整篇內容的preview。直接使用第1個section的內容，至多前Ｎ個字。N=160。
 * @apiSuccess {Number}  experiences.like_count 讚數
 * @apiSuccess {Number}  experiences.reply_count 留言數
 * @apiSuccess {Number}  experiences.report_count 檢舉數
 * @apiSuccess (interview) {String="彰化縣","嘉義市","嘉義縣","新竹市","新竹縣","花蓮縣","高雄市","基隆市","金門縣","連江縣","苗栗縣","南投縣","新北市","澎湖縣","屏東縣","臺中市","臺南市","臺北市","臺東縣","桃園市","宜蘭縣","雲林縣"} experiences.region 面試地區
 * @apiSuccess (interview) {Object} [experiences.salary] 面談薪資
 * @apiSuccess (interview) {String="year","month","day","hour"} experiences.salary.type 面談薪資種類 (面談薪資存在的話，一定有此欄位)
 * @apiSuccess (interview) {Number="整數, >= 0"} experiences.salary.amount 面談薪資金額 (面談薪資存在的話，一定有此欄位)
 * @apiSuccess (work) {String="彰化縣","嘉義市","嘉義縣","新竹市","新竹縣","花蓮縣","高雄市","基隆市","金門縣","連江縣","苗栗縣","南投縣","新北市","澎湖縣","屏東縣","臺中市","臺南市","臺北市","臺東縣","桃園市","宜蘭縣","雲林縣"} experiences.region 工作地區
 * @apiSuccess (work) {String="整數或浮點數, 0 <= N <= 168"} [experiences.week_work_time] 一週工時
 * @apiSuccess (work) {Object} [experiences.salary] 工作薪資
 * @apiSuccess (work) {String="year","month","day","hour"} experiences.salary.type 工作薪資種類 (工作薪資存在的話，一定有此欄位)
 * @apiSuccess (work) {Number} experiences.salary.amount 工作薪資金額 (工作薪資存在的話，一定有此欄位)
 * @apiSuccess {Object}  experiences.archive 封存
 * @apiSuccess {String}  experiences.archive.reason 封存理由
 * @apiSuccess {Boolean}  experiences.archive.is_achived 是否封存
 */
/* eslint-enable */
router.get(
    "/",
    wrap(async (req, res) => {
        validateGetExperiencesInput(req);

        const search_query = req.query.search_query;
        const search_by = req.query.search_by;
        const sort_field = req.query.sort || "created_at";
        const start = parseInt(req.query.start, 10) || 0;
        const limit = parseInt(req.query.limit, 10) || 20;
        // 在插入實習經驗的時期，加上 interview,work as default value
        // 避免前端的網頁出問題
        const type = req.query.type || "interview,work";

        const query = _queryToDBQuery(search_query, search_by, type);
        _saveKeyWord(search_query, search_by, req.manager);

        const db_sort_field =
            sort_field === "popularity" ? "like_count" : sort_field;
        const sort = {
            [db_sort_field]: -1,
        };

        const experience_model = new ExperienceModel(req.db);
        const total = await experience_model.getExperiencesCountByQuery(query);
        const experiences = await experience_model.getExperiences(
            query,
            sort,
            start,
            limit
        );

        res.send({
            experiences: experiencesView(experiences),
            total,
        });
    })
);

/* eslint-disable */
/**
 * @api {get} /experiences/:id 顯示單篇面試或工作經驗 API
 * @apiGroup Experiences
 * @apiSuccess {String="interview","work"}  type 經驗類別
 * @apiSuccess {String}  created_at 資料填寫時間
 * @apiSuccess {Object}  company 公司
 * @apiSuccess {String}  [company.id] 公司統編
 * @apiSuccess {String}  company.name 公司名稱
 * @apiSuccess {String}  job_title 職稱
 * @apiSuccess {String="整數, 0 <= N <= 50"}  [experience_in_year] 相關職務工作經驗
 * @apiSuccess {String="大學","碩士","博士","高職","五專","二專","二技","高中","國中","國小"}  [education] 最高學歷
 * @apiSuccess {String="彰化縣","嘉義市","嘉義縣","新竹市","新竹縣","花蓮縣","高雄市","基隆市","金門縣","連江縣","苗栗縣","南投縣","新北市","澎湖縣","屏東縣","臺中市","臺南市","臺北市","臺東縣","桃園市","宜蘭縣","雲林縣"}  region 面試地區/工作地區
 * @apiSuccess {String}  title 標題
 * @apiSuccess {Object[]}  sections 整篇內容
 * @apiSuccess {String}  sections.subtitle 段落標題
 * @apiSuccess {String}  sections.content 段落內容
 * @apiSuccess {Number}  like_count 讚數
 * @apiSuccess {Number}  reply_count 留言數
 * @apiSuccess {Number}  report_count 檢舉數
 * @apiSuccess {Boolean}  liked 該名使用者是否已經讚過該篇經驗分享 (若使用者未登入，則不會回傳本欄位)
 * @apiSuccess (interview) {Object}  interview_time 面試時間
 * @apiSuccess (interview) {Number}  interview_time.year 面試時間的年份
 * @apiSuccess (interview) {Number="1,2,3...12"}  interview_time.month 面試時間的月份
 * @apiSuccess (interview) {String}  interview_result 面試結果 ( `錄取` `未錄取` `沒通知`或其他 0 < length <= 10 的字串 )
 * @apiSuccess (interview) {Number}  overall_rating 整體面試滿意度 (整數, 1~5)
 * @apiSuccess (interview) {Object}  [salary] 面談薪資
 * @apiSuccess (interview) {String="year","month","day","hour"} salary.type 面談薪資種類 (面談薪資存在的話，一定有此欄位)
 * @apiSuccess (interview) {Number="整數, >= 0"} salary.amount 面談薪資金額 (面談薪資存在的話，一定有此欄位)
 * @apiSuccess (interview) {String[]}  interview_sensitive_questions 面試中提及的特別問題(較敏感/可能違法)陣列。 (可能為空陣列)
 * @apiSuccess (interview) {Object[]}  interview_qas 面試題目列表 (可能為空陣列)
 * @apiSuccess (interview) {String}  [interview_qas.question] 面試題目
 * @apiSuccess (interview) {String}  [interview_qas.answer] 面試題目的回答
 * @apiSuccess (work) {Object}  [salary] 工作薪資
 * @apiSuccess (work) {String="year","month","day","hour"} salary.type 工作薪資種類 (工作薪資存在的話，一定有此欄位)
 * @apiSuccess (work) {Number}  salary.amount 工作薪資金額 (工作薪資存在的話，一定有此欄位)
 * @apiSuccess (work) {Number}  [week_work_time] 一週工時
 * @apiSuccess (work) {Object}  data_time 離職時間或留資料的時間。若 `is_currently_employed` = `yes`則為 `created_at`  的年月，若為`no` ，則為 `job_ending_time`
 * @apiSuccess (work) {Number}  data_time.year 留資料的時間或離職的年份
 * @apiSuccess (work) {Number="1,2,3...12"}  data_time.month 留資料的時間或離職的月份
 * @apiSuccess (work) {String}  [recommend_to_others="yes","no"] 是否推薦此工作
 * @apiError (Error) 403 該篇文章已被隱藏
 * @apiError (Error) 404 該篇文章不存在
 */
/* eslint-enable */
router.get("/:id", [
    semiAuthentication("bearer", { session: false }),
    wrap(async (req, res) => {
        const id_str = req.params.id;
        let user = null;

        if (req.user) {
            user = req.user;
        }

        const experience_model = new ExperienceModel(req.db);
        const experience_like_model = new ExperienceLikeModel(req.db);

        const experience_id = ensureToObjectId(id_str);
        const experience = await experience_model.findOneOrFail(experience_id);

        if (experience.status === "hidden") {
            throw new HttpError("the experience is hidden", 403);
        }

        if (user) {
            const like = await experience_like_model.getLikeByExperienceIdAndUser(
                id_str,
                user
            );
            const result = experienceView(experience);
            result.liked = !!like;
            res.send(result);
        } else {
            res.send(experienceView(experience));
        }
    }),
]);

function _isLegalStatus(value) {
    const legal_status = ["published", "hidden"];
    return legal_status.indexOf(value) > -1;
}

/**
 * @api {patch} /experiences/:id 更新自已建立的經驗狀態 API
 * @apiParam {String="published","hidden"} status 要更新成的狀態
 * @apiGroup Experiences
 * @apiSuccess {Boolean} success 是否成功點讚
 * @apiSuccess {String} status 更新後狀態
 */
router.patch("/:id", [
    passport.authenticate("bearer", { session: false }),
    wrap(async (req, res) => {
        const id = req.params.id;
        const status = req.body.status;
        const user = req.user;

        if (!_isLegalStatus(status)) {
            throw new HttpError("status is illegal", 422);
        }

        const experience_model = new ExperienceModel(req.db);

        const experience_id = ensureToObjectId(id);
        const experience = await experience_model.findOneOrFail(experience_id, {
            author_id: 1,
        });

        if (!experience.author_id.equals(user._id)) {
            throw new HttpError("user is unauthorized", 403);
        }

        const result = await experience_model.updateStatus(id, status);

        res.send({
            success: true,
            status: result.value.status,
        });
    }),
]);

// reference: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
    const newArray = array.slice();
    let currentIndex = array.length;
    let temporaryValue;
    let randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex !== 0) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = newArray[currentIndex];
        newArray[currentIndex] = newArray[randomIndex];
        newArray[randomIndex] = temporaryValue;
    }

    return newArray;
}

/* eslint-disable */
/**
 * @api {get} /experiences/:id/recommended 取得你可能也想看的經驗分享列表 API
 * @apiGroup Experiences
 * @apiParam {String="0 < limit <=10 "} [limit = 10] 最多回傳limit筆資料
 * @apiSuccess {Number} total 總資料數
 * @apiSuccess {Object[]} experiences 經驗資料
 * @apiSuccess {String} experiences._id 經驗分享 id
 * @apiSuccess {String="interview","work"} experiences.type 經驗類別
 * @apiSuccess {String} experiences.created_at 資料填寫時間
 * @apiSuccess {Object} experiences.company 公司
 * @apiSuccess {String} [experiences.company.id] 公司統編
 * @apiSuccess {String} experiences.company.name 公司名稱
 * @apiSuccess {String} experiences.job_title 職稱
 * @apiSuccess {String} experiences.title 標題
 * @apiSuccess {string} experiences.preview 整篇內容的preview。直接使用第1個section的內容，至多前Ｎ個字。N=160。
 * @apiSuccess {Number}  experiences.like_count 讚數
 * @apiSuccess {Number}  experiences.reply_count 留言數
 * @apiSuccess {Number}  experiences.report_count 檢舉數
 * @apiSuccess (interview) {String="彰化縣","嘉義市","嘉義縣","新竹市","新竹縣","花蓮縣","高雄市","基隆市","金門縣","連江縣","苗栗縣","南投縣","新北市","澎湖縣","屏東縣","臺中市","臺南市","臺北市","臺東縣","桃園市","宜蘭縣","雲林縣"} experiences.region 面試地區
 * @apiSuccess (interview) {Object} [experiences.salary] 面談薪資
 * @apiSuccess (interview) {String="year","month","day","hour"} experiences.salary.type 面談薪資種類 (面談薪資存在的話，一定有此欄位)
 * @apiSuccess (interview) {Number="整數, >= 0"} experiences.salary.amount 面談薪資金額 (面談薪資存在的話，一定有此欄位)
 * @apiSuccess (work) {String="彰化縣","嘉義市","嘉義縣","新竹市","新竹縣","花蓮縣","高雄市","基隆市","金門縣","連江縣","苗栗縣","南投縣","新北市","澎湖縣","屏東縣","臺中市","臺南市","臺北市","臺東縣","桃園市","宜蘭縣","雲林縣"} experiences.region 工作地區
 * @apiSuccess (work) {String="整數或浮點數, 0 <= N <= 168"} [experiences.week_work_time] 一週工時
 * @apiSuccess (work) {Object} [experiences.salary] 工作薪資
 * @apiSuccess (work) {String="year","month","day","hour"} experiences.salary.type 工作薪資種類 (工作薪資存在的話，一定有此欄位)
 * @apiSuccess (work) {Number} experiences.salary.amount 工作薪資金額 (工作薪資存在的話，一定有此欄位)
 * @apiSuccess {Object}  experiences.archive 封存
 * @apiSuccess {String}  experiences.archive.reason 封存理由
 * @apiSuccess {Boolean}  experiences.archive.is_achived 是否封存
 */
/* eslint-enable */
router.get(
    "/:id/recommended",
    wrap(async (req, res) => {
        const id_str = req.params.id;
        const limit = Number(req.query.limit || 10);

        if (!requiredNumberInRange(limit, 1, 10)) {
            throw new HttpError("limit 格式錯誤", 422);
        }

        const query = { status: "published" };
        const sort = { like_count: -1 };

        const experience_model = new ExperienceModel(req.db);
        const experiences = await experience_model.getExperiences(
            query,
            sort,
            0,
            20
        );

        // here do some pre-process: remove same ID experience, and shuffle them.
        const shuffled_experiences = shuffle(
            experiences.filter(
                experience => experience._id.toString() !== id_str
            )
        );
        const length =
            shuffled_experiences.length > limit
                ? limit
                : shuffled_experiences.length;

        const maxLengthView = R.compose(
            experiencesView,
            R.take(length)
        );

        res.send({
            experiences: maxLengthView(shuffled_experiences),
            total: length,
        });
    })
);

router.use("/", require("./replies"));
router.use("/", require("./likes"));
router.use("/", require("./reports"));

module.exports = router;
