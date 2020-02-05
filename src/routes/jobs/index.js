const express = require("express");
const { makeExecutableSchema } = require("graphql-tools");
const { graphql } = require("graphql");

const wrap = require("../../libs/wrap");
const { HttpError } = require("../../libs/errors");

const resolvers = require("../../schema/resolvers");
const typeDefs = require("../../schema/typeDefs");

const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
});

const router = express.Router();

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
router.get(
    "/search",
    wrap(async (req, res) => {
        const key = req.query.key;
        const page = req.query.page;

        const query = /* GraphQL */ `
            query JobTitles($query: String, $page: Int) {
                job_titles(query: $query, page: $page) {
                    id
                    name
                }
            }
        `;

        const input = {
            query: key,
            page,
        };

        const { data, errors } = await graphql(schema, query, null, req, input);

        if (errors) {
            throw new HttpError(errors, 500);
        }

        const { job_titles } = data;

        const _job_titles = job_titles.map(job_title => ({
            _id: job_title.id,
            des: job_title.name,
        }));

        res.send(_job_titles);
    })
);

module.exports = router;
