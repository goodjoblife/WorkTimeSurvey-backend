const express = require("express");
const passport = require("passport");
const wrap = require("../../libs/wrap");
const {
    shouldIn,
    requiredNonEmptyString,
    stringRequireLength,
} = require("../../libs/validation");
const { HttpError, ObjectNotExistError } = require("../../libs/errors");
const ReplyModel = require("../../models/reply_model");
const ReplyHistoryModel = require("../../models/reply_history_model");
const { ensureToObjectId } = require("../../models/index");

const router = express.Router();

/**
 * @api {patch} /replies/:id 更新留言狀態
 * @apiParam {String="published","hidden"} status 要更新成的狀態
 * @apiGroup Replies
 * @apiPermission author
 * @apiSuccess {Boolean} success 是否成功點讚
 * @apiSuccess {String} status 更新後狀態
 * @apiError 403 如果 user 嘗試修改它人的留言
 */
router.patch("/:reply_id", [
    passport.authenticate("bearer", { session: false }),
    wrap(async (req, res) => {
        const reply_id_str = req.params.reply_id;
        const status = req.body.status;
        const user = req.user;

        if (!shouldIn(status, ["published", "hidden"])) {
            throw new HttpError("status is illegal", 422);
        }

        const reply_model = new ReplyModel(req.db);

        try {
            const reply = await reply_model.getReplyById(reply_id_str);

            if (!reply.author_id.equals(user._id)) {
                throw new HttpError("user is unauthorized", 403);
            }

            await reply_model.updateStatus(reply._id, status);

            res.send({
                success: true,
                status,
            });
        } catch (err) {
            if (err instanceof ObjectNotExistError) {
                throw new HttpError(err.message, 404);
            }
            throw err;
        }
    }),
]);

/**
 * @api {put} /replies/:id 更新留言
 * @apiParam {String="0 < length <= 1000 "} content 更新留言內容
 * @apiGroup Replies
 * @apiPermission author
 * @apiSuccess {Boolean} success 是否成功更新
 * @apiError 403 如果 user 嘗試修改它人的留言
 */
router.put("/:reply_id", [
    passport.authenticate("bearer", { session: false }),
    wrap(async (req, res) => {
        const reply_id_str = req.params.reply_id;
        const content = req.body.content;
        const user = req.user;
        const MAX_CONTENT_SIZE = 1000;
        const reply_id = ensureToObjectId(reply_id_str);

        if (!requiredNonEmptyString(content)) {
            throw new HttpError("留言內容必填！", 422);
        }
        if (!stringRequireLength(content, 1, MAX_CONTENT_SIZE)) {
            throw new HttpError("留言內容請少於 1000 個字元", 422);
        }

        const reply_model = new ReplyModel(req.db);
        const reply_history_model = new ReplyHistoryModel(req.db);

        try {
            const old_reply = await reply_model.getReplyById(reply_id_str);

            if (!old_reply.author_id.equals(user._id)) {
                throw new HttpError("user is unauthorized", 403);
            }

            delete old_reply._id;
            old_reply.ref_id = reply_id;
            old_reply.time_stamp = new Date();

            await reply_history_model.createReplyHistory(old_reply);

            const result = await reply_model.updateReply(reply_id, content);

            res.send({
                success: result.ok === 1,
            });
        } catch (err) {
            if (err instanceof ObjectNotExistError) {
                throw new HttpError(err.message, 404);
            }
            throw err;
        }
    }),
]);

router.use("/", require("./likes"));
router.use("/", require("./reports"));

module.exports = router;
