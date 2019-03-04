const Type = `
    type SearchJobTitlePayload {
        job_titles: [JobTitle!]!
    }

    type JobTitle {
        name: String!

        salary_work_times: [SalaryWorkTime!]!

        salary_work_time_statistics: SalaryWorkTimeStatistics!
    }
`;

const Query = `
    extend type Query {
        search_job_titles(query: String!): SearchJobTitlePayload!
    }
`;

const Mutation = `
`;

const resolvers = {
    Query: {
        async search_job_titles() {
            // TODO
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
