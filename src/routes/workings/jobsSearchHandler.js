const escapeRegExp = require("lodash/escapeRegExp");
const wrap = require("../../libs/wrap");
const { HttpError } = require("../../libs/errors");

const jobsSearchHandler = wrap(async (req, res) => {
    const search = req.query.key || "";
    const page = parseInt(req.query.page, 10) || 0;

    if (search === "") {
        throw new HttpError("key is required", 422);
    }

    const collection = req.db.collection("workings");

    const results = await collection
        .aggregate([
            {
                $sort: {
                    job_title: 1,
                },
            },
            {
                $match: {
                    job_title: new RegExp(escapeRegExp(search.toUpperCase())),
                },
            },
            {
                $group: {
                    _id: "$job_title",
                },
            },
            {
                $limit: 25 * page + 25,
            },
            {
                $skip: 25 * page,
            },
        ])
        .toArray();
    res.send(results);
});

module.exports = jobsSearchHandler;
