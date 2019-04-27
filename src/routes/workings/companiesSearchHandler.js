const escapeRegExp = require("lodash/escapeRegExp");
const wrap = require("../../libs/wrap");
const { HttpError } = require("../../libs/errors");

const companiesSearchHandler = wrap(async (req, res) => {
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
                    company: 1,
                },
            },
            {
                $match: {
                    $or: [
                        {
                            "company.name": new RegExp(
                                escapeRegExp(search.toUpperCase())
                            ),
                        },
                        { "company.id": search },
                    ],
                },
            },
            {
                $group: {
                    _id: "$company",
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

module.exports = companiesSearchHandler;
