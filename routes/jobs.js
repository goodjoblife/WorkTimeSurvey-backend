const express = require("express");
const escapeRegExp = require("lodash/escapeRegExp");
const wrap = require("../libs/wrap");

const router = express.Router();

/**
 * @api {get} /jobs/search 從職稱清單中搜尋職稱
 * @apiDescription 從職稱清單中根據關鍵字搜尋職稱，每頁顯示 25 筆資料，如果關鍵字為空，則匹配所有職稱
 * @apiGroup Jobs
 * @apiParam {String} [key] 關鍵字
 * @apiParam {Number} [page=0] 頁碼
 * @apiSuccess {Object[]} .
 * @apiSuccess {String} ._id 代號
 * @apiSuccess {String} .des 職稱名
 */
router.get(
    "/search",
    wrap(async (req, res) => {
        const search = req.query.key || "";
        const page = req.query.page || 0;
        let q;

        if (search === "") {
            q = { isFinal: true };
        } else {
            q = {
                des: new RegExp(escapeRegExp(search.toUpperCase())),
                isFinal: true,
            };
        }

        const collection = req.db.collection("job_titles");

        const results = await collection
            .find(q, { isFinal: 0 })
            .skip(25 * page)
            .limit(25)
            .toArray();

        res.send(results);
    })
);

module.exports = router;
