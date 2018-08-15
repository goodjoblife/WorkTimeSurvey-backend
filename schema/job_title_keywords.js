const R = require("ramda");
const { HttpError } = require("../libs/errors");
const { requiredNumberInRange } = require("../libs/validation");

const Type = `
`;

const Query = `
  extend type Query {
    job_title_keywords(limit: Int = 5): [String!]!
  }
`;

const Mutation = `
`;

const resolvers = {
    Query: {
        async job_title_keywords(obj, { limit }, ctx) {
            if (!requiredNumberInRange(limit, 1, 20)) {
                throw new HttpError("limit should be 1~20", 422);
            }

            const jobTitleKeywordModel = ctx.manager.JobTitleKeywordModel;
            const results = await jobTitleKeywordModel.aggregate({ limit });

            return R.map(R.prop("_id"))(results);
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
