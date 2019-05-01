const express = require("express");

const router = express.Router();

const authorization = require("../../middlewares/authorization");

router.get("/search", [
    (req, res, next) => {
        if (req.user) {
            next();
        } else {
            res.send({ hasSearchPermission: false });
        }
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
