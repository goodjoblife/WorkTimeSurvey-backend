const express = require('express');

const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const lodash = require('lodash');
const winston = require('winston');
const CompanyModel = require('../../models/company_model');
const getCompanyName = require('../company_helper').getCompanyName;

function _generateGetCompanyViewModel(companies) {
    const result = companies.map((company) => ({
        id: company.id,
        name: getCompanyName(company.name),
        capital: company.capital,
    }));
    return result;
}

/**
 * @api {get} /companies/search Search Company
 * @apiName SearchCompany
 * @apiGroup Company
 * @apiParam {String} key
 * @apiParam {Number} [page=0]
 * @apiSuccess {Object[]} . Companies
 */
router.get('/search', (req, res, next) => {
    winston.info("/workings/search", { query: req.query, ip: req.ip, ips: req.ips });

    const search = req.query.key || "";
    const page = req.query.page || 0;

    if (search === "") {
        next(new HttpError("key is required", 422));
        return;
    }

    const query = {
        $or: [
                { name: new RegExp(`^${lodash.escapeRegExp(search.toUpperCase())}`) },
                { id: search },
        ],
    };

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

module.exports = router;

