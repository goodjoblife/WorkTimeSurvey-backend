const express = require("express");

const router = express.Router();

// please sort in alphabetical order
router.use("/auth", require("./auth"));
router.use("/companies", require("./companies"));
router.use("/experiences", require("./experiences"));
router.use("/interview_experiences", require("./interview_experiences"));
router.use("/jobs", require("./jobs"));
router.use("/me", require("./me"));
router.use("/replies", require("./replies"));
router.use("/workings", require("./workings"));
router.use("/work_experiences", require("./work_experiences"));

module.exports = router;
