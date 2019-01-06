const Type = `
    type Working {
        _id: ID!
        company: Company!
        job_title: String!
        sector: String
        salary: Salary
        week_work_time: Float
        estimated_hourly_wage: Float
        created_at: Date
        data_time: DataTime
        overtime_frequency: Int
        about_this_job: String
    }

    type Company {
        id: ID
        name: String!
    }

    type Salary {
        type: SalaryType!
        amount: Int!
    }

    enum SalaryType {
        YEAR
        MONTH
        DAY
        HOUR
    }

    type DataTime {
        year: Int
        month: Int
    }

    scalar Date
`;

const Query = `
    extend type Query {
        extreme_workings(input: QueryExtremeWorkingsInput!): [Working!]!
    }

    input Sort {
        sort_field: Sort_By = CREATED_AT
        order_by: Order_By = DESCENDING
    }

    enum Sort_By {
        CREATED_AT
        WEEK_WORK_TIME
        ESTIMATED_HOURLY_WAGE
    }

    enum Order_By {
        DESCENDING
        ASCENDING
    }

    input QueryExtremeWorkingsInput {
        sort: Sort_By
    }
`;

const Mutation = `
`;

const resolvers = {
    Query: {
        async extreme_workings(_, args, ctx) {
            const {
                input: {
                    sort: { sort_field, order_by },
                },
            } = args;

            const _sort_by = sort_field.toLowerCase();
            const _order = order_by === "DESCENDING" ? -1 : 1;
            const sort = { [_sort_by]: _order };

            const collection = ctx.db.collection("workings");
            const opt = {
                company: 1,
                sector: 1,
                created_at: 1,
                job_title: 1,
                data_time: 1,
                week_work_time: 1,
                overtime_frequency: 1,
                salary: 1,
                estimated_hourly_wage: 1,
                about_this_job: 1,
            };
            const base_query = {
                status: "published",
                "archive.is_archived": false,
            };

            const count = await collection.find(base_query).count();

            const defined_query = {
                [_sort_by]: { $exists: true },
                ...base_query,
            };
            const undefined_query = {
                [_sort_by]: { $exists: false },
                ...base_query,
            };

            const skip = Math.floor(count * 0.01);

            const defined_results = await collection
                .find(defined_query, opt)
                .sort(sort)
                .limit(skip)
                .toArray();

            if (defined_results.length < skip) {
                const undefined_results = await collection
                    .find(undefined_query, opt)
                    .limit(skip - defined_results.length)
                    .toArray();

                return defined_results.concat(undefined_results);
            }

            return defined_results;
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
