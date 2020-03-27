const Event = require("./Event");
const { createSalary } = require("./EventType");
const ExperienceModel = require("../../models/experience_model");

class CreateSalaryEvent extends Event {
    constructor(userId) {
        super({
            userId,
            taskName: createSalary,
        });
    }

    /**
     * @typedef {Object} DispatchPayload
     * @property {Object} db - database object
     * @property {Object} data - consist of snapshot and eventStatus
     * @property {Object} experienceId - experienceId that should be verified
     */
    /**
     * Dispatch to queue
     * @param {DispatchPayload} obj - dispatch payload
     */
    async dispatchToQueue({ db, data, experienceId }) {
        const experience_model = new ExperienceModel(db);
        const { salary } = await experience_model.findOneOrFail(experienceId);
        if (!salary) {
            throw Error("Validation failed");
        }
        await super.dispatchToQueue(data);
    }
}

module.exports = CreateSalaryEvent;
