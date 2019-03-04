const { gql } = require("apollo-server-express");
const escapeRegExp = require("lodash/escapeRegExp");

const Type = gql`
    type Company {
        name: String!

        salary_work_times: [SalaryWorkTime!]!

        salary_work_time_statistics: SalaryWorkTimeStatistics!
    }
`;

const Query = gql`
    extend type Query {
        search_companies(query: String!): [Company!]!
    }
`;

const Mutation = `
`;

const resolvers = {
    Query: {
        async search_companies(_, { query: company }, ctx) {
            const collection = ctx.db.collection("workings");

            // FIXME: should query from collection `companies`
            const results = await collection
                .aggregate([
                    {
                        $match: {
                            status: "published",
                            "archive.is_archived": false,
                            "company.name": new RegExp(
                                escapeRegExp(company.toUpperCase())
                            ),
                        },
                    },
                    {
                        $group: {
                            _id: "$company",
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            id: "$_id.id",
                            name: "$_id.name",
                        },
                    },
                ])
                .toArray();

            return results;
        },
    },
    Company: {
        salary_work_times: async (company, _, ctx) => {
            const collection = ctx.db.collection("workings");

            const salaryWorkTimes = await collection
                .aggregate([
                    {
                        $match: {
                            status: "published",
                            "archive.is_archived": false,
                            "company.name": company.name,
                        },
                    },
                    {
                        $addFields: {
                            id: "$_id",
                        },
                    },
                ])
                .toArray();

            return salaryWorkTimes;
        },
        salary_work_time_statistics: async (company, _, ctx) => {
            const collection = ctx.db.collection("workings");

            const statistics = await collection
                .aggregate([
                    {
                        $match: {
                            status: "published",
                            "archive.is_archived": false,
                            "company.name": company.name,
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            has_overtime_salary_yes: {
                                $sum: {
                                    $cond: [
                                        {
                                            $eq: [
                                                "$has_overtime_salary",
                                                "yes",
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            has_overtime_salary_no: {
                                $sum: {
                                    $cond: [
                                        { $eq: ["$has_overtime_salary", "no"] },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            has_overtime_salary_dont: {
                                $sum: {
                                    $cond: [
                                        {
                                            $eq: [
                                                "$has_overtime_salary",
                                                "don't know",
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            is_overtime_salary_legal_yes: {
                                $sum: {
                                    $cond: [
                                        {
                                            $eq: [
                                                "$is_overtime_salary_legal",
                                                "yes",
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            is_overtime_salary_legal_no: {
                                $sum: {
                                    $cond: [
                                        {
                                            $eq: [
                                                "$is_overtime_salary_legal",
                                                "no",
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            is_overtime_salary_legal_dont: {
                                $sum: {
                                    $cond: [
                                        {
                                            $eq: [
                                                "$is_overtime_salary_legal",
                                                "don't know",
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            has_compensatory_dayoff_yes: {
                                $sum: {
                                    $cond: [
                                        {
                                            $eq: [
                                                "$has_compensatory_dayoff",
                                                "yes",
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            has_compensatory_dayoff_no: {
                                $sum: {
                                    $cond: [
                                        {
                                            $eq: [
                                                "$has_compensatory_dayoff",
                                                "no",
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            has_compensatory_dayoff_dont: {
                                $sum: {
                                    $cond: [
                                        {
                                            $eq: [
                                                "$has_compensatory_dayoff",
                                                "don't know",
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            avg_week_work_time: {
                                $avg: "$week_work_time",
                            },
                            avg_estimated_hourly_wage: {
                                $avg: "$estimated_hourly_wage",
                            },
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $project: {
                            count: 1,
                            average_week_work_time: "$avg_week_work_time",
                            average_estimated_hourly_wage:
                                "$avg_estimated_hourly_wage",
                            has_overtime_salary_count: {
                                $cond: [
                                    { $gte: ["$count", 5] },
                                    {
                                        yes: "$has_overtime_salary_yes",
                                        no: "$has_overtime_salary_no",
                                        unknown: "$has_overtime_salary_dont",
                                    },
                                    "$skip",
                                ],
                            },
                            is_overtime_salary_legal_count: {
                                $cond: [
                                    { $gte: ["$count", 5] },
                                    {
                                        yes: "$is_overtime_salary_legal_yes",
                                        no: "$is_overtime_salary_legal_no",
                                        unknown:
                                            "$is_overtime_salary_legal_dont",
                                    },
                                    "$skip",
                                ],
                            },
                            has_compensatory_dayoff_count: {
                                $cond: [
                                    { $gte: ["$count", 5] },
                                    {
                                        yes: "$has_compensatory_dayoff_yes",
                                        no: "$has_compensatory_dayoff_no",
                                        unknown:
                                            "$has_compensatory_dayoff_dont",
                                    },
                                    "$skip",
                                ],
                            },
                        },
                    },
                ])
                .toArray();

            return statistics[0];
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
