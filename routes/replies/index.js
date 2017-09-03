const express = require('express');
const passport = require('passport');
const wrap = require('../../libs/wrap');
const { shouldIn } = require('../../libs/validation');
const {
    HttpError,
    ObjectNotExistError,
} = require('../../libs/errors');
const ReplyModel = require('../../models/reply_model');

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
router.patch('/:reply_id', [
    passport.authenticate('bearer', { session: false }),
    wrap(async (req, res) => {
        const reply_id_str = req.params.reply_id;
        const status = req.body.status;
        const user = req.user;

        if (!shouldIn(status, ['published', 'hidden'])) {
            throw new HttpError('status is illegal', 422);
        }

        const reply_model = new ReplyModel(req.db);

        try {
            const reply = await reply_model.getReplyById(reply_id_str);

            if (!reply.author_id.equals(user._id)) {
                throw new HttpError('user is unauthorized', 403);
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

router.use('/', require('./likes'));
router.use('/', require('./reports'));

module.exports = router;
