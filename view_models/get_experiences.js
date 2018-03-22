const R = require("ramda");
const { combineSelector } = require("./helper");

const MAX_PREVIEW_SIZE = 160;

const isInterview = R.propEq("type", "interview");

const isWork = R.propEq("type", "work");

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

/**
 * @param experience
 */
const experienceView = combineSelector([
    commonSelector,
    previewSelector,
    R.cond([[isInterview, interviewSelector], [isWork, workSelector]]),
]);

/**
 * @param experiences
 */
const experiencesView = R.map(experienceView);

module.exports.experiencesView = experiencesView;
