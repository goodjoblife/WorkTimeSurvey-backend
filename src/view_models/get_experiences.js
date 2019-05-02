const R = require("ramda");
const { combineSelector } = require("./helper");

const MAX_PREVIEW_SIZE = 160;

const isInterview = R.propEq("type", "interview");

const isWork = R.propEq("type", "work");

const isIntern = R.propEq("type", "intern");

const commonSelector = R.pick([
    "_id",
    "type",
    "created_at",
    "company",
    "job_title",
    "title",
    "like_count",
    "reply_count",
    "report_count",
    "status",
    "archive",
]);

const previewSelector = experience => {
    const section = R.head(experience.sections);
    if (!section) {
        return { preview: null };
    }
    return {
        preview: section.content.substring(0, MAX_PREVIEW_SIZE),
    };
};

const interviewSelector = R.pick(["region", "salary"]);

const workSelector = R.pick(["region", "salary", "week_work_time"]);

const internSelector = R.pick([
    "region",
    "salary",
    "starting_year",
    "period",
    "week_work_time",
]);

/**
 * @param experience
 */
const experienceView = combineSelector([
    commonSelector,
    previewSelector,
    R.cond([
        [isInterview, interviewSelector],
        [isWork, workSelector],
        [isIntern, internSelector],
    ]),
]);

/**
 * @param experiences
 */
const experiencesView = R.map(experienceView);

module.exports.experiencesView = experiencesView;
