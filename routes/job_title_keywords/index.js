const express = require("express");

const router = express.Router();
const wrap = require("../../libs/wrap");
const { HttpError } = require("../../libs/errors");
const { requiredNumberInRange } = require("../../libs/validation");

/**
 * @api {get} /job_title_keywords 取得以職稱搜尋的熱門關鍵字 API
 * @apiGroup Popular Keywords
 * @apiParam {Number=5} num 回傳的關鍵字數
 * @apiSuccess {String[]} keywords 以職稱查詢的熱門關鍵字列表
 */
router.get(
    "/",
    wrap(async (req, res, next) => {
        const num = req.query.num ? Number(req.query.num) : 5;

        if (!Number.isInteger(num)) {
            throw new HttpError("number should be integer", 422);
        } else if (!requiredNumberInRange(num, 1, 20)) {
            throw new HttpError("number should be 1~20", 422);
        }

        const jobTitleKeywordModel = req.manager.JobTitleKeywordModel;

        const results = await jobTitleKeywordModel.aggregate({ limit: num });
        const keywords = results.map(result => result._id);

        res.send({ keywords });
    })
);

module.exports = router;
