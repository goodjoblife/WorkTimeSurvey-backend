const express = require('express');
const router = express.Router();
const HttpError = require('../libs/errors').HttpError;
const lodash = require('lodash');
const winston = require('winston');

/**
 * @api {get} /companies/search Search Company
 * @apiName SearchCompany
 * @apiGroup Company
 * @apiParam {String} key
 * @apiParam {Number} [page=0]
 * @apiSuccess {Object[]} . Companies
 */
router.get('/search', function(req, res, next) {
    winston.info("/workings/search", {query: req.query, ip: req.ip, ips: req.ips});

    const search = req.query.key || "";
    const page = req.query.page || 0;
    var q;

    if (search == "") {
        throw new HttpError("key is required", 422);
    } else {
        q = {
            $or: [
                {name: new RegExp("^" + lodash.escapeRegExp(search.toUpperCase()))},
                {id: search},
            ]
        };
    }

    const s = {
        capital: -1,
        type: -1,
        name: 1,
        id: 1,
    };

    const collection = req.db.collection('companies');

    collection.find(q).sort(s).skip(25 * page).limit(25).toArray().then((results) => {
        res.send(results);
    }).catch((err) => {
        next(new HttpError("Internal Server Error", 500));
    });
});

module.exports = router;
