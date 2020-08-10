const Event = require("./Event");
const { createWorkExperience } = require("./EventType");
const ExperienceModel = require("../../models/experience_model");
const taskConfigMap = require("./task_config");

class CreateWorkExperienceEvent extends Event {
    constructor(userId) {
        super({
            userId,
            taskName: createWorkExperience,
            points: taskConfigMap[createWorkExperience].points,
            maxRunCount: taskConfigMap[createWorkExperience].maxRunCount,
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

module.exports = CreateWorkExperienceEvent;
