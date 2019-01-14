const merge = require("lodash/merge");

module.exports = merge(
    require("./company_keywords").resolvers,
    require("./job_title_keywords").resolvers,
    require("./me").resolvers,
    require("./users").resolvers
);
