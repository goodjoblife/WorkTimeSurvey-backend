const Query = `
  type Query {
    placeholder: Boolean # For Schema Composition
  }
`;

const Mutation = `
  type Mutation {
    placeholder: Boolean # For Schema Composition
  }
`;

module.exports = [
    Query,
    Mutation,
    ...require("./company_keywords").types,
    ...require("./job_title_keywords").types,
    ...require("./me").types,
    ...require("./users").types,
];
