const express = require("express");

const router = express.Router();

const HttpError = require("../../libs/errors").HttpError;
const {
    requireUserAuthetication,
} = require("../../middlewares/authentication");
const recommendation = require("../../libs/recommendation");
const wrap = require("../../libs/wrap");

router.post("/", [
    requireUserAuthetication,
    wrap(async (req, res, next) => {
        try {
            const old_user = {
                id: req.user.facebook_id,
                type: "facebook",
            };
            const recommendation_string = await recommendation.getRecommendationString(
                req.db,
                old_user
            );

            res.send({
                user: old_user,
                recommendation_string,
            });
        } catch (err) {
            next(new HttpError("Internal Server Error", 500));
        }
    }),
]);

module.exports = router;
