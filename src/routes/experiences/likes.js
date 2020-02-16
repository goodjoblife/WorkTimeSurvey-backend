const express = require("express");
const winston = require("winston");
const { makeExecutableSchema } = require("graphql-tools");
const { graphql } = require("graphql");

const {
    requireUserAuthetication,
} = require("../../middlewares/authentication");
const { HttpError } = require("../../libs/errors");
const wrap = require("../../libs/wrap");

const resolvers = require("../../schema/resolvers");
const typeDefs = require("../../schema/typeDefs");

const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
});

const router = express.Router();

/**
 * @api {post} /experiences/:id/likes 新增單篇經驗的讚 API
 * @apiGroup Experiences Likes
 * @apiSuccess {Boolean} success 是否成功點讚
 */
// TODO: deprecated
router.post("/:id/likes", [
    requireUserAuthetication,
    wrap(async (req, res) => {
        const experience_id = req.params.id;

        const query = /* GraphQL */ `
            mutation CreateExperienceLike($input: CreateExperienceLikeInput!) {
                createExperienceLike(input: $input) {
                    experienceLike {
                        id
                    }
                }
            }
        `;

        const input = {
            input: { experience_id },
        };

        const { errors } = await graphql(schema, query, null, req, input);

        if (errors) {
            const message = errors[0].message;

            winston.info(req.originalUrl, {
                id: experience_id,
                ip: req.ip,
                ips: req.ips,
                err: message,
            });

            if (message === "Unauthorized") {
                throw new HttpError(errors, 401);
            } else if (message === "該篇文章已經被按讚") {
                throw new HttpError(errors, 403);
            } else if (
                message === "id_string 不是合法的 ObjectId" ||
                message === "該篇文章不存在"
            ) {
                throw new HttpError(errors, 404);
            }

            throw new HttpError(errors, 500);
        }

        res.send({ success: true });
    }),
]);

/**
 * @api {delete} /experiences/:id/likes 移除單篇經驗的讚 API
 * @apiGroup Experiences Likes
 * @apiSuccess {Boolean} success 是否成功取消讚
 */
// TODO: deprecated
router.delete("/:id/likes", [
    requireUserAuthetication,
    wrap(async (req, res) => {
        const experience_id = req.params.id;

        const query = /* GraphQL */ `
            mutation DeleteExperienceLike($input: DeleteExperienceLikeInput!) {
                deleteExperienceLike(input: $input) {
                    deletedExperienceId
                }
            }
        `;

        const input = {
            input: { experience_id },
        };

        const { errors } = await graphql(schema, query, null, req, input);

        if (errors) {
            const message = errors[0].message;

            winston.info(req.originalUrl, {
                id: experience_id,
                ip: req.ip,
                ips: req.ips,
                err: message,
            });

            if (message === "Unauthorized") {
                throw new HttpError(errors, 401);
            } else if (
                message === "id_string 不是合法的 ObjectId" ||
                message === "該篇文章不存在" ||
                message === "此讚不存在"
            ) {
                throw new HttpError(errors, 404);
            }

            throw new HttpError(errors, 500);
        }

        res.send({ success: true });
    }),
]);

module.exports = router;
