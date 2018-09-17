const express = require("express");

const router = express.Router();
const HttpError = require("../../../libs/errors").HttpError;
const ExperienceModel = require("../../../models/experience_model");
const {
    requiredNumberInRange,
    requiredNumberGreaterThanOrEqualTo,
} = require("../../../libs/validation");
const wrap = require("../../../libs/wrap");
const { experiencesView } = require("../../../view_models/get_experiences");
const passport = require("passport");

function _generateDBQuery(author_id, type) {
    const query = {};
    query.author_id = author_id;

    if (type) {
        const types = type.split(",");
        if (types.length === 1) {
            query.type = types[0];
        } else {
            query.type = {
                $in: types,
            };
        }
    }
    return query;
}

/* eslint-disable */
/**
 * @api {get} /me/experiences 取得自已的經驗分享列表 API
 * @apiGroup Me
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
 * @apiSuccess {String= "published","hidden"} experience.status 狀態
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
router.get("/", [
    passport.authenticate("bearer", { session: false }),
    wrap(async (req, res) => {
        const user = req.user;
        const start = parseInt(req.query.start, 10) || 0;
        const limit = Number(req.query.limit || 20);
        const sort = {
            created_at: -1,
        };
        const type = req.query.type || "interview,work";
        const query = _generateDBQuery(user._id, type);

        if (!requiredNumberGreaterThanOrEqualTo(start, 0)) {
            throw new HttpError("start 格式錯誤", 422);
        }

        if (!requiredNumberInRange(limit, 1, 100)) {
            throw new HttpError("limit 格式錯誤", 422);
        }

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
    }),
]);

module.exports = router;
