const Event = require("./Event");
const { createInterviewExperience } = require("./EventType");
const ExperienceModel = require("../../models/experience_model");

class CreateInterviewExperienceEvent extends Event {
    constructor(userId) {
        super({
            userId,
            taskName: createInterviewExperience,
        });
    }

    /**
     * @typedef {Object} DispatchPayload
     * @property {Object} db - database object
     * @property {Object} data - consist of snapshot and eventStatus
     * @property {Object} experienceId - experienceId that should be verified
     * @property {Number} point - task points to be rewarded
     */
    /**
     * Dispatch to queue
     * @param {DispatchPayload} obj - dispatch payload
     */
    async dispatchToQueue({ db, data, experienceId }) {
        const experience_model = new ExperienceModel(db);
        if (!(await experience_model.isExist(experienceId))) {
            throw Error("Validation failed");
        }
        return await super.dispatchToQueue(data);
    }
}

module.exports = CreateInterviewExperienceEvent;
