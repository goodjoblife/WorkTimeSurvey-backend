const { gql } = require("apollo-server-express");

const Type = gql`
    scalar Date
`;

const Query = gql`
    type Query {
        placeholder: Boolean # For Schema Composition
    }
`;

const Mutation = gql`
    type Mutation {
        placeholder: Boolean # For Schema Composition
    }
`;

module.exports = [
    Type,
    Query,
    Mutation,
    // 盡量按造字典排序
    ...require("./company_keyword").types,
    ...require("./company").types,
    ...require("./experience").types,
    ...require("./job_title_keyword").types,
    ...require("./job_title").types,
    ...require("./me").types,
    ...require("./reply").types,
    ...require("./salary_work_time").types,
    ...require("./user").types,
];
