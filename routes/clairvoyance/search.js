const express = require('express');
const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const winston = require('winston');

router.get('/by-job', function(req, res, next) {
    next();
});

router.get('/by-company', function(req, res, next) {
    winston.info("/clairvoyance/search/by-company", {company: req.query.company, ip: req.ip, ips: req.ips});

    const company = req.query.company;
    const collection = req.db.collection('workings');

    if (! company || company === '') {
        next(new HttpError("company is required", 422));
        return;
    }
    collection.find(
    	{
    		$or: [
            	{'company.name': new RegExp(lodash.escapeRegExp(company.toUpperCase()))},
                {'company.id': company},
            ]
    	}
    ).toArray().then(function(results) {
        res.send(results);
    }).catch(function(err) {
        next(new HttpError("Internal Server Error", 500));
    });
});

module.exports = router;
