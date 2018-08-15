const R = require("ramda");
const { HttpError } = require("../libs/errors");
const { requiredNumberInRange } = require("../libs/validation");

const Type = `
`;

const Query = `
  extend type Query {
    company_keywords(limit: Int = 5): [String!]!
  }
`;

const Mutation = `
`;

const resolvers = {
    Query: {
        async company_keywords(obj, { limit }, ctx) {
            if (!requiredNumberInRange(limit, 1, 20)) {
                throw new HttpError("limit should be 1~20", 422);
            }

            const companyKeywordModel = ctx.manager.CompanyKeywordModel;
            const results = await companyKeywordModel.aggregate({ limit });

            return R.map(R.prop("_id"))(results);
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
