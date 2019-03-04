const { gql } = require("apollo-server-express");

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
    Query,
    Mutation,
    ...require("./company_keyword").types,
    ...require("./job_title_keyword").types,
    ...require("./me").types,
    ...require("./user").types,
];
