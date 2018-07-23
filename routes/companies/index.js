const express = require("express");
const R = require("ramda");
const { HttpError } = require("../../libs/errors");
const wrap = require("../../libs/wrap");

const router = express.Router();

/**
 * @param company
 */
const companyView = R.pick(["id", "capital", "name"]);

/**
 * @param companies
 */
const searchView = R.map(companyView);

/**
 * @api {get} /companies/search Search Company
 * @apiName SearchCompany
 * @apiGroup Company
 * @apiParam {String} key
 * @apiParam {Number} [page=0]
 * @apiSuccess {Object[]} . Companies
 */
router.get(
    "/search",
    wrap(async (req, res) => {
        const search = req.query.key || "";
        const page = req.query.page || 0;

        if (search === "") {
            throw new HttpError("key is required", 422);
            return;
        }

        const company_model = req.manager.CompanyModel;
        const companies = await company_model.search({
            keyword: search,
            start: 25 * page,
            limit: 25,
        });

        res.send(searchView(companies));
    })
);

module.exports = router;
