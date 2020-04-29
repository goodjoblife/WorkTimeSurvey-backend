const express = require("express");
const router = express.Router();
const wrap = require("../../libs/wrap");
const jwt = require("../../utils/jwt");
const facebook = require("../../libs/facebook");
const google = require("../../libs/google");
const { requiredNonEmptyString } = require("../../libs/validation");
const { HttpError } = require("../../libs/errors");
const { User } = require("../../models");

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
// TODO: deprecated
router.post(
    "/facebook",
    wrap(async (req, res) => {
        if (!requiredNonEmptyString(req.body.access_token)) {
            throw new HttpError("Unauthorized", 401);
        }
        const access_token = req.body.access_token;

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
        let user = await User.findOneByFacebookId(facebook_id);
        if (!user) {
            user = new User({
                name,
                facebook_id,
                facebook: account,
                email: account.email,
            });
            await user.save();
        }

        if (!user.name && account.name) {
            user.name = account.name;
            await user.save();
        }

        if (!user.email && account.email) {
            user.name = account.email;
            await user.save();
        }

        // Sign token
        const token = await jwt.signUser(user);

        // Response
        res.send({
            user: {
                _id: user._id,
                facebook_id: user.facebook_id,
                email: user.email,
            },
            token,
        });
    })
);

// TODO: maybe rewrite into graphql
// TODO: deprecated
router.post(
    "/google",
    wrap(async (req, res) => {
        if (!requiredNonEmptyString(req.body.id_token)) {
            throw new HttpError("Unauthorized", 401);
        }
        const idToken = req.body.id_token;

        // Check access_token with google server
        let account = null;
        try {
            account = await google.verifyIdToken(idToken);
        } catch (e) {
            throw new HttpError("Unauthorized", 401);
        }

        // Retrieve User from DB
        const google_id = account.sub;

        let user = await User.findOneByGoogleId(google_id);
        if (!user) {
            user = new User({
                name: account.name,
                google_id,
                google: account,
                email: account.email,
            });
            await user.save();
        }

        if (!user.name && account.name) {
            user.name = account.name;
            await user.save();
        }

        if (!user.email && account.email) {
            user.name = account.email;
            await user.save();
        }

        // Sign token
        const token = await jwt.signUser(user);

        // Response
        res.send({
            user: {
                _id: user._id,
                google_id: user.google_id,
            },
            token,
        });
    })
);

module.exports = router;
