const express = require("express");
const passport = require("passport");

const router = express.Router();

const authorization = require("../../middlewares/authorization");

router.get("/search", [
    (req, res, next) => {
        passport.authenticate("bearer", { session: false }, (err, user) => {
            if (user) {
                req.user = user;
                next();
            } else {
                res.send({ hasSearchPermission: false });
            }
        })(req, res, next);
    },
    authorization.cachedSearchPermissionAuthorizationMiddleware,
    // Middleware Error Handler
    // eslint-disable-next-line
    (err, req, res, next) => {
        res.send({ hasSearchPermission: false });
    },
    (req, res) => {
        res.send({ hasSearchPermission: true });
    },
]);

module.exports = router;
