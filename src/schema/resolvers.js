const R = require("ramda");
const merge = R.reduce(R.mergeDeepLeft, {});

module.exports = merge([
    // 盡量按造字典排序
    require("./company_keyword").resolvers,
    require("./company").resolvers,
    require("./experience").resolvers,
    require("./experience_like").resolvers,
    require("./job_title_keyword").resolvers,
    require("./job_title").resolvers,
    require("./labor_right").resolvers,
    require("./me").resolvers,
    require("./reply").resolvers,
    require("./reply_like").resolvers,
    require("./reward").resolvers,
    require("./salary_work_time").resolvers,
    require("./task").resolvers,
    require("./user").resolvers,
    require("./verify_email").resolvers,
    require("./view_log").resolvers,
]);
