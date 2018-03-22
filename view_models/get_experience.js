const R = require("ramda");
const { combineSelector } = require("./helper");

const isInterview = R.propEq("type", "interview");

const isWork = R.propEq("type", "work");

const commonSelector = R.pick([
    "_id",
    "type",
    "created_at",
    "company",
    "job_title",
    "experience_in_year",
    "education",
    "region",
    "title",
    "sections",
    "like_count",
    "reply_count",
    "report_count",
]);

const interviewSelector = R.pick([
    "interview_time",
    "interview_result",
    "overall_rating",
    "salary",
    "interview_sensitive_questions",
    "interview_qas",
]);

const workSelector = R.pick([
    "salary",
    "week_work_time",
    "data_time",
    "recommend_to_others",
]);

/**
 * @param experience
 */
const experienceView = combineSelector([
    commonSelector,
    R.cond([[isInterview, interviewSelector], [isWork, workSelector]]),
]);

module.exports = {
    experienceView,
};
