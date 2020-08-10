const Event = require("./Event");
const { createInterviewExperience } = require("./EventType");
const ExperienceModel = require("../../models/experience_model");
const taskConfigMap = require("./task_config");

class CreateInterviewExperienceEvent extends Event {
    constructor(userId) {
        super({
            userId,
            taskName: createInterviewExperience,
            points: taskConfigMap[createInterviewExperience].points,
            maxRunCount: taskConfigMap[createInterviewExperience].maxRunCount,
        });
    }

    /**
     * @typedef {Object} DispatchPayload
     * @property {Object} db - database object
     * @property {Object} experienceId - experienceId that should be verified
     */
    /**
     * Dispatch to queue
     * @param {DispatchPayload} obj - dispatch payload
     */
    async exec({ db, experienceId }) {
        const experience_model = new ExperienceModel(db);
        if (!(await experience_model.isExist(experienceId))) {
            throw Error("Validation failed");
        }
        return await super.exec(experienceId);
    }
}

module.exports = CreateInterviewExperienceEvent;
