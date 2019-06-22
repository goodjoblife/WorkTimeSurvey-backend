const { gql } = require("apollo-server-express");
const { ObjectId } = require("mongodb");
const {
    VIEW_ACTION,
    SALARY_WORK_TIME_TYPE,
} = require("../models/view_log_model");

const Type = `
`;

const Query = `
`;

const Mutation = gql`
    input ViewSalaryWorkTimesInput {
        content_ids: [String!]!
        referrer: String
    }

    type ViewSalaryWorkTimesPayload {
        status: String!
    }

    extend type Mutation {
        viewSalaryWorkTimes(
            input: ViewSalaryWorkTimesInput!
        ): ViewSalaryWorkTimesPayload!
    }
`;

const resolvers = {
    Mutation: {
        async viewSalaryWorkTimes(root, { input }, { user, manager }) {
            const {
                content_ids: content_ids_raw,
                referrer: referrer_raw,
            } = input;

            if (content_ids_raw.length == 0) {
                return { status: "ok" };
            }

            const content_ids = content_ids_raw.map(x => ObjectId(x));
            const referrer = referrer_raw ? referrer_raw : null;

            const user_id = user ? user._id : null;
            const current = new Date();
            const logs = content_ids.map(content_id => ({
                user_id,
                action: VIEW_ACTION,
                content_id,
                content_type: SALARY_WORK_TIME_TYPE,
                referrer: referrer ? referrer : null,
                created_at: current,
            }));

            await manager.ViewLogModel.insertMany(logs);

            return { status: "ok" };
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
