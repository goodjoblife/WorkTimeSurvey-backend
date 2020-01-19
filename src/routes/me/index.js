const express = require("express");

const router = express.Router();

router.use("/permissions", require("./permissions"));
router.use("/recommendations", require("./recommendations"));

module.exports = router;
