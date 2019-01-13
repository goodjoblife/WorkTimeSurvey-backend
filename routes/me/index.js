const express = require("express");
const {
    requireUserAuthetication,
} = require("../../middlewares/authentication");
const wrap = require("../../libs/wrap");

const router = express.Router();

router.get("/", [
    requireUserAuthetication,
    wrap((req, res) => {
        const user = req.user;
        res.send({ user });
    }),
]);
router.use("/experiences", require("./experiences"));
router.use("/permissions", require("./permissions"));
router.use("/recommendations", require("./recommendations"));
router.use("/replies", require("./replies"));
router.use("/workings", require("./workings"));

module.exports = router;
