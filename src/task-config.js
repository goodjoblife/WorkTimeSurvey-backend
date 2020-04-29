const {
    createSalaryWorkTime,
    createInterviewExperience,
    createWorkExperience,
    shareWebsite,
    unlockExperience,
    unlockSalaryWorkTime,
    createInterviewExperienceBonus,
    createWorkExperienceBonus,
} = require("./libs/events/EventType");

const taskConfigMap = {
    [createSalaryWorkTime]: {
        points: 1,
        maxRunCount: 5,
    },
    [createInterviewExperience]: {
        points: 1,
        maxRunCount: 5,
    },
    [createWorkExperience]: {
        points: 1,
        maxRunCount: 5,
    },
    [shareWebsite]: {
        points: 1,
        maxRunCount: 5,
    },
    [unlockExperience]: {
        points: 1,
        maxRunCount: 5,
    },
    [unlockSalaryWorkTime]: {
        points: 1,
        maxRunCount: 5,
    },
    [createInterviewExperienceBonus]: {
        points: 1,
        maxRunCount: 5,
    },
    [createWorkExperienceBonus]: {
        points: 1,
        maxRunCount: 5,
    },
};

module.exports = taskConfigMap;
