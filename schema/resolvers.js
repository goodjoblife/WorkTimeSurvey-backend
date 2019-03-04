const R = require("ramda");
const merge = R.reduce(R.mergeDeepLeft, {});

module.exports = merge([
    require("./company").resolvers,
    require("./company_keyword").resolvers,
    require("./experience").resolvers,
    require("./job_title").resolvers,
    require("./job_title_keyword").resolvers,
    require("./me").resolvers,
    require("./reply").resolvers,
    require("./salary_work_time").resolvers,
    require("./user").resolvers,
]);
