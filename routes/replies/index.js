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
const { replyToHistoryMap } = require("../../models/model_maps");
const replyPolicy = require("../../policies/reply_policy");

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

function validatePutInput(body) {
    const MAX_CONTENT_SIZE = 1000;
    const { content } = body;

    if (!requiredNonEmptyString(content)) {
        throw new HttpError("留言內容必填！", 422);
    }
    if (!stringRequireLength(content, 1, MAX_CONTENT_SIZE)) {
        throw new HttpError("留言內容請少於 1000 個字元", 422);
    }
}

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
        const reply_id = ensureToObjectId(req.params.reply_id);

        validatePutInput(req.body);

        const reply_model = new ReplyModel(req.db);
        const reply_history_model = new ReplyHistoryModel(req.db);

        const old_reply = await reply_model.findOneOrFail(reply_id);

        // Apply policy
        if (!replyPolicy.canUpdate(req.user, old_reply)) {
            throw new HttpError("Forbidden", 403);
        }

        const content = req.body.content;

        const reply_history = replyToHistoryMap(old_reply);

        await reply_history_model.createReplyHistory(reply_history);

        const result = await reply_model.updateReply(reply_id, content);

        res.send({
            success: result.ok === 1,
        });
    }),
]);

router.use("/", require("./likes"));
router.use("/", require("./reports"));

module.exports = router;
