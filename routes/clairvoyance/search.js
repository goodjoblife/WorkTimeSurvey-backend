const express = require('express');

const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const escapeRegExp = require('lodash/escapeRegExp');
const winston = require('winston');

/**
 * @api {get} /clairvoyance/search/by-job 依據職稱搜尋工時資訊
 * @apiGroup Clairvoyance
 * @apiParam {String} job_title 搜尋的職稱關鍵字
 * @apiParam {Number} [page=0] 頁碼，從 0 開始
 * @apiSuccess {Number} page 頁碼
 * @apiSuccess {Number} total_count 總計數量
 * @apiSuccess {Number} total_page 總計頁數
 * @apiSuccess {Object[]} workings 資料集
 * @apiSuccess {Object} workings.company 公司
 * @apiSuccess {String} workings.company.id 公司統編
 * @apiSuccess {Object} workings.company.name
 * @apiSuccess {Date} workings.created_at 建立時間
 * @apiSuccess {String} workings.job_title 職稱
 * @apiSuccess {Number} workings.week_work_time 最近一週工作時數
 */
router.get('/by-job', (req, res, next) => {
    winston.info('/clairvoyance/search/by-job', { job_title: req.query.job_title, ip: req.ip, ips: req.ips });
    const job_title = req.query.job_title;
    const page = req.query.page || 0;

    const collection = req.db.collection('workings');

    if (!job_title || job_title === '') {
        next(new HttpError("job_title is required", 422));
        return;
    }

    // mongodb query
    const db_query = {
        job_title: new RegExp(escapeRegExp(job_title.toUpperCase())),
    };

    // sorted order
    const db_sort = {
        created_at: -1,
    };

    // display fields
    const opt = {
        _id: 0,
        job_title: 1,
        company: 1,
        created_at: 1,
        week_work_time: 1,
    };

    const data = {};

    collection.find(db_query).count().then((count) => {
        data.total_count = count;
        data.total_page = Math.ceil(count / 25);

        return collection
            .find(db_query, opt)
            .sort(db_sort)
            .skip(25 * page)
            .limit(25)
            .toArray();
    })
    .then((workings) => {
        data.page = page;
        data.workings = workings;

        res.send(data);
    })
    .catch((err) => {
        next(new HttpError("Internal Server Error", 500));
    });
});

/**
 * @api {get} /clairvoyance/search/by-company 依據職稱搜尋工時資訊
 * @apiGroup Clairvoyance
 * @apiParam {String} company 搜尋的公司關鍵字（名稱、統編皆可）
 * @apiParam {Number} [page=0] 頁碼，從 0 開始
 * @apiSuccess {Number} page 頁碼
 * @apiSuccess {Number} total_count 總計數量
 * @apiSuccess {Number} total_page 總計頁數
 * @apiSuccess {Object[]} workings 資料集
 * @apiSuccess {Object} workings.company 公司
 * @apiSuccess {String} workings.company.id 公司統編
 * @apiSuccess {Object} workings.company.name
 * @apiSuccess {Date} workings.created_at 建立時間
 * @apiSuccess {String} workings.job_title 職稱
 * @apiSuccess {Number} workings.week_work_time 最近一週工作時數
 */
router.get('/by-company', (req, res, next) => {
    winston.info("/clairvoyance/search/by-company", { company: req.query.company, ip: req.ip, ips: req.ips });

    const company = req.query.company;
    const page = req.query.page || 0;

    const collection = req.db.collection('workings');

    if (!company || company === '') {
        next(new HttpError("company is required", 422));
        return;
    }

    // mongodb query
    const q = {
        $or: [
                { 'company.name': new RegExp(escapeRegExp(company.toUpperCase())) },
                { 'company.id': company },
        ],
    };

    // sort field
    const s = {
        created_at: -1,
    };

    // displayed fields
    const opt = {
        _id: 0,
        job_title: 1,
        company: 1,
        created_at: 1,
        week_work_time: 1,
    };

    const data = {};

    collection.find(q).count().then((count) => {
        data.total_count = count;
        data.total_page = Math.ceil(count / 25);
        return collection
            .find(q, opt)
            .sort(s)
            .skip(25 * page)
            .limit(25)
            .toArray();
    })
    .then((workings) => {
        data.page = page;
        data.workings = workings;

        res.send(data);
    })
    .catch((err) => {
        next(new HttpError("Internal Server Error", 500));
    });
});

module.exports = router;
