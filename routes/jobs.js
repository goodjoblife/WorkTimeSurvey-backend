const express = require('express');
const router = express.Router();
const request = require('request');
const HttpError = require('../libs/errors').HttpError;
const lodash = require('lodash');
const winston = require('winston');

/**
 * @api {get} /jobs/search 從職稱清單中搜尋職稱
 * @apiDescription 從職稱清單中根據關鍵字搜尋職稱，每頁顯示 25 筆資料，如果關鍵字為空，則匹配所有職稱
 * @apiGroup Jobs
 * @apiParam {String} [key] 關鍵字
 * @apiParam {Number} [page=0] 頁碼
 * @apiSuccess {Object[]} .
 * @apiSuccess {String} ._id 代號
 * @apiSuccess {String} .des 職稱名
 */
router.get('/search', function(req, res, next) {
    winston.info("/jobs/search", {query: req.query, ip: req.ip, ips: req.ips});

    const search = req.query.key || "";
    const page = req.query.page || 0;
    var q;

    if (search == "") {
        q = {isFinal: true};
    } else {
        q = {des: new RegExp(lodash.escapeRegExp(search.toUpperCase())), isFinal: true};
    }

    const collection = req.db.collection('job_titles');

    collection.find(q, {isFinal: 0}).skip(25 * page).limit(25).toArray().then((results) => {
        res.send(results);
    }).catch((err) => {
        next(new HttpError("Internal Server Error", 500));
    });
});

/*
 * GET /:job_title
 * [page = 0]
 * Show 10 results per page
 */
router.get('/:job_title/statistics', function(req, res, next) {
    winston.info("/jobs/xxx/statistics", {job_title: req.params.job_title, ip: req.ip, ips: req.ips});

    const job_title = req.params.job_title;
    const collection = req.db.collection('workings');

    const page = req.query.page || 0;

    collection.aggregate([
        {
            $match: {
                job_title: job_title,
            }
        },
        {
            $group: {
                _id: "$company",
                week_work_times: {$push: "$week_work_time"},
                average_week_work_time: {$avg: "$week_work_time"},
                count: {$sum: 1},
            }
        },
        {
            $sort: {
                average_week_work_time: -1,
            }
        },
        {
            $limit: page * 10 + 10,
        },
        {
            $skip: page * 10,
        },
    ]).toArray().then((results) => {
        res.send(results);
    }).catch((err) => {
        next(new HttpError("Internal Server Error", 500));
    });
});

module.exports = router;
