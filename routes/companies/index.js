const express = require('express');
const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const lodash = require('lodash');
const winston = require('winston');
const CompanyModel = require('../../models/company_model');
const getCompanyName = require('../company_helper').getCompanyName;

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
    let query;

    if (search == "") {
        throw new HttpError("key is required", 422);
    } else {
        query = {
            $or: [
                {name: new RegExp("^" + lodash.escapeRegExp(search.toUpperCase()))},
                {id: search},
            ],
        };
    }

    const sort_by = {
        capital: -1,
        type: -1,
        name: 1,
        id: 1,
    };

    const company_model = new CompanyModel(req.db);
    const skip = 25 * page;
    const limit = 25;

    company_model.searchCompany(query, sort_by, skip, limit).then((results) => {
        res.send(_generateGetCompanyViewModel(results));
    }).catch((err) => {
        next(new HttpError("Internal Server Error", 500));
    });
});

function _generateGetCompanyViewModel(companies) {
    const result = companies.map((company) => {
        return {
            id: company.id,
            name: getCompanyName(company.name),
            capital: company.capital,
        };
    });
    return result;
}

module.exports = router;

