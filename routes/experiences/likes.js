const express = require("express");
const winston = require("winston");
const passport = require("passport");

const ExperienceLikeModel = require("../../models/experience_like_model");
const ExperienceModel = require("../../models/experience_model");
const PopularExperienceLogsModel = require("../../models/popular_experience_logs_model");
const { ensureToObjectId } = require("../../models");
const {
    ObjectNotExistError,
    HttpError,
    DuplicateKeyError,
} = require("../../libs/errors");
const wrap = require("../../libs/wrap");

const router = express.Router();

/**
 * @api {post} /experiences/:id/likes 新增單篇經驗的讚 API
 * @apiGroup Experiences Likes
 * @apiSuccess {Boolean} success 是否成功點讚
 */
router.post("/:id/likes", [
    passport.authenticate("bearer", { session: false }),
    wrap(async (req, res, next) => {
        const user = req.user;
        const experience_id = ensureToObjectId(req.params.id);

        const experience_like_model = new ExperienceLikeModel(req.db);
        const experience_model = new ExperienceModel(req.db);
        const popular_experience_logs_model = new PopularExperienceLogsModel(
            req.db
        );

        try {
            await experience_model.findOneOrFail(experience_id, { _id: 1 });
            await experience_like_model.createLike(experience_id, user);
            await experience_model.incrementLikeCount(experience_id);
            await popular_experience_logs_model.insertLog({
                experience_id,
                user_id: user._id,
                action_type: "like",
            });

            res.send({ success: true });
        } catch (err) {
            winston.info(req.originalUrl, {
                id: experience_id,
                ip: req.ip,
                ips: req.ips,
                err: err.message,
            });

            if (err instanceof DuplicateKeyError) {
                next(new HttpError(err.message, 403));
            } else if (err instanceof ObjectNotExistError) {
                next(new HttpError(err.message, 404));
            } else {
                next(new HttpError("Internal Server Error", 500));
            }
        }
    }),
]);

/**
 * @api {delete} /experiences/:id/likes 移除單篇經驗的讚 API
 * @apiGroup Experiences Likes
 * @apiSuccess {Boolean} success 是否成功取消讚
 */
router.delete("/:id/likes", [
    passport.authenticate("bearer", { session: false }),
    wrap(async (req, res, next) => {
        const user = req.user;
        const experience_id = ensureToObjectId(req.params.id);

        const experience_like_model = new ExperienceLikeModel(req.db);
        const experience_model = new ExperienceModel(req.db);

        try {
            await experience_model.findOneOrFail(experience_id, { _id: 1 });
            await experience_like_model.deleteLike(experience_id, user);
            await experience_model.decrementLikeCount(experience_id);

            res.send({ success: true });
        } catch (err) {
            winston.info(req.originalUrl, {
                id: experience_id,
                ip: req.ip,
                ips: req.ips,
                err: err.message,
            });

            if (err instanceof DuplicateKeyError) {
                next(new HttpError(err.message, 403));
            } else if (err instanceof ObjectNotExistError) {
                next(new HttpError(err.message, 404));
            } else {
                next(new HttpError("Internal Server Error", 500));
            }
        }
    }),
]);

module.exports = router;
