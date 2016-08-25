const express = require('express');
const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const lodash = require('lodash');
const winston = require('winston');

router.get('/by-job', function(req, res, next) {
    next();
});

router.get('/by-company', function(req, res, next) {
    winston.info("/clairvoyance/search/by-company", {company: req.query.company, ip: req.ip, ips: req.ips});

    const company = req.query.company;
    const page = req.query.page || 0;

    const collection = req.db.collection('workings');

    if (! company || company === '') {
        next(new HttpError("company is required", 422));
        return;
    }

    //mongodb query
    const q = {
            $or: [
                {'company.name': new RegExp(lodash.escapeRegExp(company.toUpperCase()))},
                {'company.id': company},
            ]
    };

    //sort field
    const s = {
        created_at: -1,
    };

    //displayed fields
    const opt = {
        _id: 0,
        job_title: 1,
        company: 1, 
        created_at: 1,
        week_work_time: 1,
    };

    const data = {};

    collection.find(q).count().then(function(count) {
        data.total_count = count;
        data.total_page = Math.ceil(count / 25); 
        return collection.find(q, opt).sort(s).skip(25 * page).limit(25).toArray();
    }).then(function(workings) {
        data.page = page;
        data.workings = workings;

        res.send(data);
    }).catch(function(err) {
        next(new HttpError("Internal Server Error", 500));
    });
});

module.exports = router;
