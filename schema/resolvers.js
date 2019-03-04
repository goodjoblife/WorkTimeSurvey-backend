const R = require("ramda");
const merge = R.reduce(R.mergeDeepLeft, {});

module.exports = merge([
    require("./company_keyword").resolvers,
    require("./job_title_keyword").resolvers,
    require("./me").resolvers,
    require("./user").resolvers,
]);
