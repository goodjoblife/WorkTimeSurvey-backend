const express = require("express");

const router = express.Router();

// please sort in alphabetical order
router.use("/companies", require("./companies"));
router.use("/experiences", require("./experiences"));
router.use("/me", require("./me"));
router.use("/replies", require("./replies"));
router.use("/workings", require("./workings"));
router.use("/work_experiences", require("./work_experiences"));

module.exports = router;
