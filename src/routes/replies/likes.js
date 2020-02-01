const express = require("express");
const { makeExecutableSchema } = require("graphql-tools");
const { graphql } = require("graphql");

const HttpError = require("../../libs/errors").HttpError;
const wrap = require("../../libs/wrap");
const {
    requireUserAuthetication,
} = require("../../middlewares/authentication");

const resolvers = require("../../schema/resolvers");
const typeDefs = require("../../schema/typeDefs");

const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
});

const router = express.Router();

/**
 * @api {post} /replies/:id/likes 新增留言的讚 API
 * @apiGroup Replies Likes
 * @apiSuccess {Boolean} success 是否成功點讚
 */
router.post("/:reply_id/likes", [
    requireUserAuthetication,
    wrap(async (req, res) => {
        const reply_id = req.params.reply_id;
        if (typeof reply_id === "undefined") {
            throw new HttpError("id error", 404);
        }

        const query = /* GraphQL */ `
            mutation CreateReplyLike($input: CreateReplyLikeInput!) {
                createReplyLike(input: $input) {
                    replyLike {
                        id
                    }
                }
            }
        `;

        const input = {
            input: { reply_id },
        };

        const { errors } = await graphql(schema, query, null, req, input);

        if (errors) {
            const message = errors[0].message;

            if (message === "Unauthorized") {
                throw new HttpError(errors, 401);
            } else if (message === "該留言已經被按讚") {
                throw new HttpError(errors, 403);
            } else if (message === "這篇留言不存在") {
                throw new HttpError(errors, 404);
            }

            throw new HttpError(errors, 500);
        }

        res.send({ success: true });
    }),
]);

/**
 * @api {delete} /replies/:id/likes 移除留言的讚 API
 * @apiGroup Replies Likes
 * @apiSuccess {Boolean} success 是否成功取消讚
 */
router.delete("/:reply_id/likes", [
    requireUserAuthetication,
    wrap(async (req, res) => {
        const reply_id = req.params.reply_id;
        if (typeof reply_id === "undefined") {
            throw new HttpError("Not Found", 404);
        }

        const query = /* GraphQL */ `
            mutation DeleteReplyLike($input: DeleteReplyLikeInput!) {
                deleteReplyLike(input: $input) {
                    deletedReplyLikeId
                }
            }
        `;

        const input = {
            input: { id: reply_id },
        };

        const { errors } = await graphql(schema, query, null, req, input);

        if (errors) {
            const message = errors[0].message;

            if (message === "Unauthorized") {
                throw new HttpError(errors, 401);
            } else if (message === "讚不存在" || message === "這篇留言不存在") {
                throw new HttpError(errors, 404);
            }

            throw new HttpError(errors, 500);
        }

        res.send({ success: true });
    }),
]);

module.exports = router;
