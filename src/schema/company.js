const { gql } = require("apollo-server-express");
const escapeRegExp = require("lodash/escapeRegExp");

const Type = gql`
    type Company {
        name: String!

        "取得資料本身"
        salary_work_times: [SalaryWorkTime!]!
        work_experiences(start: Int, limit: Int): [WorkExperience!]!
        interview_experiences(start: Int, limit: Int): [InterviewExperience!]!

        "取得統計資訊"
        salary_work_time_statistics: SalaryWorkTimeStatistics!
        work_experience_statistics: WorkExperienceStatistics!
        interview_experience_statistics: InterviewExperienceStatistics!

        "該公司內不同職業的平均薪資"
        average_salaries: [AverageSalary!]
    }
`;

const Query = gql`
    extend type Query {
        search_companies(query: String!): [Company!]!
        company(name: String!): Company
        popular_companies: [Company!]!
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

        company: async (_, { name }, ctx) => {
            const salaryWorkTimeCollection = ctx.db.collection("workings");
            const experienceCollection = ctx.db.collection("experiences");

            // 只要 salaryWorkTime / experiences 任一邊有出現，就不會回傳 null
            const companyFromSalaryWorkTime = await salaryWorkTimeCollection.findOne(
                {
                    status: "published",
                    "archive.is_archived": false,
                    "company.name": name,
                }
            );

            const companyFromExperience = await experienceCollection.findOne({
                status: "published",
                "archive.is_archived": false,
                "company.name": name,
            });

            if (companyFromSalaryWorkTime || companyFromExperience) {
                return { name };
            } else {
                return null;
            }
        },
        popular_companies: async () => [
            {
                name: "聯發科",
            },
        ],
    },
    Company: {
        salary_work_times: async (company, _, { manager }) => {
            return await manager.SalaryWorkTimeModel.byCompanyLoader.load(
                company.name
            );
        },
        salary_work_time_statistics: async (company, _, { manager }) => {
            return await manager.SalaryWorkTimeModel.byCompanyLoader.load(
                company.name
            );
        },
        work_experiences: async (company, _, { manager }) => {
            return await manager.WorkExperienceModel.byCompanyLoader.load(
                company.name
            );
        },
        interview_experiences: async (company, _, { manager }) => {
            return await manager.InterviewExperienceModel.byCompanyLoader.load(
                company.name
            );
        },
        work_experience_statistics: () => {},
        interview_experience_statistics: () => {},

        average_salaries: () => {
            return [
                {
                    company: {
                        name: "聯發科",
                    },
                    job_title: {
                        name: "軟體工程師",
                    },
                    data_count: 5,
                    salary: {
                        amount: 76000,
                        type: "month",
                    },
                },
                {
                    company: {
                        name: "聯發科",
                    },
                    job_title: {
                        name: "數位IC設計工程師",
                    },
                    data_count: 10,
                    salary: {
                        amount: 100000,
                        type: "month",
                    },
                },
                {
                    company: {
                        name: "聯發科",
                    },
                    job_title: {
                        name: "硬體工程師",
                    },
                    data_count: 10,
                    salary: {
                        amount: 80000,
                        type: "month",
                    },
                },
            ];
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
