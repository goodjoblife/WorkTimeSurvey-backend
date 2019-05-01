const R = require("ramda");
const { combineSelector } = require("./helper");

const isInterview = R.propEq("type", "interview");

const isWork = R.propEq("type", "work");

const isIntern = R.propEq("type", "intern");

const commonSelector = R.pick([
    "_id",
    "type",
    "created_at",
    "company",
    "job_title",
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
    "experience_in_year",
]);

const workSelector = R.pick([
    "salary",
    "week_work_time",
    "data_time",
    "recommend_to_others",
    "experience_in_year",
]);

const internSelector = R.pick([
    "salary",
    "starting_year",
    "period",
    "week_work_time",
    "overall_rating",
]);

/**
 * @param experience
 */
const experienceView = combineSelector([
    commonSelector,
    R.cond([
        [isInterview, interviewSelector],
        [isWork, workSelector],
        [isIntern, internSelector],
    ]),
]);

module.exports = {
    experienceView,
};
