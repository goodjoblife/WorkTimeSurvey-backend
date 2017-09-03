const express = require('express');

const router = express.Router();
const { HttpError } = require('../../../libs/errors');
const ReplyModel = require('../../../models/reply_model');
const {
    requiredNumberInRange,
    requiredNumberGreaterThanOrEqualTo,
} = require('../../../libs/validation');
const wrap = require('../../../libs/wrap');
const passport = require('passport');


function _generateGetReplyViewModel(
    { _id, content, like_count, report_count, created_at, floor, status }) {
    return {
        _id,
        content,
        like_count,
        report_count,
        created_at,
        floor,
        status,
    };
}


/* eslint-disable */
/**
 * @api {get} /me/replies 取得自已的留言列表
 * @apiGroup Me
 * @apiParam {String="整數"} [start=0] (從第 start 個留言開始 (start = 0 為第 1 筆留言）)
 * @apiParam {String="整數, 0 < N <= 100"} [limit=20] 回傳最多 limit 個留言
 * @apiSuccess {Object[]} replies 該留言的物件陣列 (按照 created_at 排序，最新的在最前
 * @apiSuccess {String} replies._id 留言的ID
 * @apiSuccess {String} replies.content 留言的內容
 * @apiSuccess {Number} replies.like_count 留言的讚數
 * @apiSuccess {Number} replies.report_count 留言的檢舉數
 * @apiSuccess {String} replies.created_at 該留言的時間
 * @apiSuccess {Number} replies.floor 樓層
 * @apiSuccess {String="published","hidden"} replies.status 狀態
 */
/* eslint-enable */
router.get('/', [
    passport.authenticate('bearer', { session: false }),
    wrap(async (req, res) => {
        const start = parseInt(req.query.start, 10) || 0;
        const limit = Number(req.query.limit || 20);

        if (!requiredNumberGreaterThanOrEqualTo(start, 0)) {
            throw new HttpError("start 格式錯誤", 422);
        }

        if (!requiredNumberInRange(limit, 100, 1)) {
            throw new HttpError("limit 格式錯誤", 422);
        }

        const sort = {
            created_at: -1,
        };
        const user = req.user;
        const query = {
            author_id: user._id,
        };

        const reply_model = new ReplyModel(req.db);
        const total = await reply_model.getCount(query);
        const replies = await reply_model.getReplies(query, sort, start, limit);

        res.send({
            total,
            replies: replies.map(_generateGetReplyViewModel),
        });
    }),
]);

module.exports = router;
