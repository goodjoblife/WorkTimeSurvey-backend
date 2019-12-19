const { gql } = require("apollo-server-express");
const escapeRegExp = require("lodash/escapeRegExp");
const { union } = require("lodash");

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
    }
`;

const Query = gql`
    extend type Query {
        search_companies(query: String!): [Company!]!
        company(name: String!): Company

        "列出所有有資料(薪資工時、職場經驗)的公司"
        companies_having_data: [Company!]!

        "目前用途：取得薪資資料前 topN 多的公司，且至少有三種職稱各至少有三筆資料"
        popular_companies(limit: Int = 5): [Company!]!
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
        companies_having_data: async (_, __, ctx) => {
            const companiesFromSalaryWorkTime = await ctx.db
                .collection("workings")
                .distinct("company.name", {
                    status: "published",
                    "archive.is_archived": false,
                });
            const companiesFromExperiences = await ctx.db
                .collection("experiences")
                .distinct("company.name", {
                    status: "published",
                    "archive.is_archived": false,
                });

            return union(
                companiesFromSalaryWorkTime,
                companiesFromExperiences
            ).map(name => {
                return {
                    name,
                };
            });
        },
        popular_companies: async (_, { limit }, ctx) => {
            const collection = ctx.db.collection("workings");
            // 符合至少有三種職缺的薪資工時資料，每種職缺至少三筆的公司
            const companies = await collection
                .aggregate([
                    { $match: { estimated_monthly_wage: { $exists: true } } },
                    {
                        $project: {
                            company: "$company.name",
                            job_title: "$job_title",
                            monthly_wage: "$estimated_monthly_wage",
                        },
                    },
                    {
                        $group: {
                            _id: {
                                company: "$company",
                                job_title: "$job_title",
                            },
                            count: { $sum: 1 },
                            avg_salary: { $avg: "$monthly_wage" },
                        },
                    },
                    // 同公司同職稱比數大於3
                    { $match: { count: { $gte: 3 } } },
                    {
                        $group: {
                            _id: "$_id.company",
                            count: { $sum: 1 },
                        },
                    },
                    // 同公司比數大於3筆
                    { $match: { count: { $gte: 3 } } },
                    { $sample: { size: limit } },
                    { $project: { name: "$_id" } },
                ])
                .toArray();
            return companies;
        },
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
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
