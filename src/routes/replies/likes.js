const express = require("express");
const HttpError = require("../../libs/errors").HttpError;
const DuplicateKeyError = require("../../libs/errors").DuplicateKeyError;
const ReplyLikeModel = require("../../models/reply_like_model");
const ReplyModel = require("../../models/reply_model");
const wrap = require("../../libs/wrap");
const {
    requireUserAuthetication,
} = require("../../middlewares/authentication");

const router = express.Router();

/**
 * @api {post} /replies/:id/likes 新增留言的讚 API
 * @apiGroup Replies Likes
 * @apiSuccess {Boolean} success 是否成功點讚
 */
router.post("/:reply_id/likes", [
    requireUserAuthetication,
    wrap(async (req, res) => {
        const reply_id = req.params.reply_id;
        if (typeof reply_id === "undefined") {
            throw new HttpError("id error", 422);
        }

        const user = req.user;
        const reply_like_model = new ReplyLikeModel(req.db);
        const reply_model = new ReplyModel(req.db);

        try {
            await reply_like_model.createLike(reply_id, user);
            await reply_model.incrementLikeCount(reply_id);
        } catch (err) {
            if (err instanceof DuplicateKeyError) {
                throw new HttpError(err.message, 403);
            }
            throw err;
        }

        res.send({ success: true });
    }),
]);

/**
 * @api {delete} /replies/:id/likes 移除留言的讚 API
 * @apiGroup Replies Likes
 * @apiSuccess {Boolean} success 是否成功取消讚
 */
router.delete("/:reply_id/likes", [
    requireUserAuthetication,
    wrap(async (req, res) => {
        const reply_id = req.params.reply_id;
        if (typeof reply_id === "undefined") {
            throw new HttpError("Not Found", 404);
        }

        const user = req.user;
        const reply_like_model = new ReplyLikeModel(req.db);
        const reply_model = new ReplyModel(req.db);

        try {
            await reply_like_model.deleteLike(reply_id, user);
            await reply_model.decrementLikeCount(reply_id);
        } catch (err) {
            if (err instanceof DuplicateKeyError) {
                throw new HttpError(err.message, 403);
            }
            throw err;
        }
        res.send({ success: true });
    }),
]);

module.exports = router;
