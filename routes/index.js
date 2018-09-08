const express = require("express");
const cors = require("cors");

const router = express.Router();

const corsOption = {
    origin: [
        new RegExp(".*://www.104.com.tw"),
        new RegExp(".*://104.com.tw"),
        new RegExp("http://www.1111.com.tw"),
        new RegExp("http://www.518.com.tw"),
        new RegExp(".*://www.yes123.com.tw"),
    ],
};

// please sort in alphabetical order
router.use(
    "/clairvoyance/search",
    cors(corsOption),
    require("./clairvoyance/search")
);
router.use("/companies", require("./companies"));
router.use("/experiences", require("./experiences"));
router.use("/interview_experiences", require("./interview_experiences"));
router.use("/jobs", require("./jobs"));
router.use("/me", require("./me"));
router.use("/replies", require("./replies"));
router.use("/workings", require("./workings"));
router.use("/work_experiences", require("./work_experiences"));

module.exports = router;
