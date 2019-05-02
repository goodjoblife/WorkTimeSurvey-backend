const express = require("express");

const router = express.Router();
const wrap = require("../../../libs/wrap");
const generateGetWorkingsViewModel = require("../../../view_models/get_workings");
const {
    requireUserAuthetication,
} = require("../../../middlewares/authentication");
const WorkingModel = require("../../../models/working_model");

/* eslint-disable */
/**
 * @api {get} /me/workings 取得自已的薪資與工時分享列表 API
 * @apiGroup Me
 * @apiPermission 使用者需登入
 * @apiSuccess {Number} total 總資料數
 * @apiSuccess {Object[]} time_and_salary 薪時資料
 * @apiSuccess {String} time_and_salary._id 薪時資料 id
 * @apiSuccess {Object} time_and_salary.company 公司
 * @apiSuccess {String} [time_and_salary.company.id] 公司統編
 * @apiSuccess {String} time_and_salary.company.name 公司名稱
 * @apiSuccess {String} time_and_salary.sector 部門/分公司/廠區
 * @apiSuccess {String} time_and_salary.created_at 資料填寫時間
 * @apiSuccess {Object} time_and_salary.data_time 資料參考時間。當填答者已離職，則用離職年月，當填答者未離職，用填寫時間年月。
 * @apiSuccess {Number} time_and_salary.data_time.year 資料參考時間的年份。
 * @apiSuccess {Number} time_and_salary.data_time.month 資料參考時間的月份。 1代表1月。
 * @apiSuccess {Number} time_and_salary.estimated_hourly_wage 估計時薪 (可能不存在)
 * @apiSuccess {String} time_and_salary.job_title 職稱
 * @apiSuccess {Number= 0(幾乎不),1(偶爾),2(經常),3(幾乎天天)} time_and_salary.overtime_frequency 加班頻率
 * @apiSuccess {Object} time_and_salary.salary 薪資資訊
 * @apiSuccess {Number} time_and_salary.salary.amount 薪資多寡
 * @apiSuccess {String= "hour","day","month","year"} time_and_salary.salary.type 薪資種類
 * @apiSuccess {Number} time_and_salary.week_work_time 每周工時
 * @apiSuccess {String= "published","hidden"} time_and_salary.status 狀態
 * @apiSuccess {Object}  time_and_salary.archive 封存
 * @apiSuccess {String}  time_and_salary.archive.reason 封存理由
 * @apiSuccess {Boolean}  time_and_salary.archive.is_achived 是否封存
 */
/* eslint-enable */
router.get("/", [
    requireUserAuthetication,
    wrap(async (req, res) => {
        const user = req.user;
        const query = {
            "author.id": user.facebook_id,
        };

        const working_model = new WorkingModel(req.db);
        const count = await working_model.getWorkingsCountByQuery(query);
        const workings = await working_model.getWorkings(query);

        res.send(generateGetWorkingsViewModel(workings, count));
    }),
]);

module.exports = router;
