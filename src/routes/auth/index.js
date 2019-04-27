const express = require("express");
const router = express.Router();
const wrap = require("../../libs/wrap");
const jwt = require("../../utils/jwt");
const facebook = require("../../libs/facebook");
const { requiredNonEmptyString } = require("../../libs/validation");
const { HttpError } = require("../../libs/errors");

/* eslint-disable */
/**
 * @api {post} /auth/facebook 驗證 FB
 * @apiGroup Auth
 * @apiParam {String} access_token Access Token
 * @apiSuccess {Object} user 登入的 User 身份
 * @apiSuccess {String} user._id 登入的 User ID
 * @apiSuccess {String} user.facebook_id 登入的 User Facebook ID
 * @apiSuccess {String} token Token
 */
/* eslint-enable */
router.post(
    "/facebook",
    wrap(async (req, res) => {
        if (!requiredNonEmptyString(req.body.access_token)) {
            throw new HttpError("Unauthorized", 401);
        }
        const access_token = req.body.access_token;

        const user_model = req.manager.UserModel;

        // Check access_token with FB server
        let account = null;
        try {
            account = await facebook.accessTokenAuth(access_token);
        } catch (e) {
            throw new HttpError("Unauthorized", 401);
        }

        // Retrieve User from DB
        const facebook_id = account.id;
        const name = account.name;
        let user = await user_model.findOneByFacebookId(facebook_id);
        if (!user) {
            user = await user_model.create({
                name,
                facebook_id,
                facebook: account,
            });
        }

        if (!user.name) {
            await user_model.collection.updateOne(
                { _id: user._id },
                { $set: { name: account.name } }
            );
        }

        // Sign token
        const token = await jwt.signUser(user);

        // Response
        res.send({
            user: {
                _id: user._id,
                facebook_id: user.facebook_id,
            },
            token,
        });
    })
);

module.exports = router;
