const Event = require("./Event");
const { createSalary } = require("./EventType");
const WorkingModel = require("../../models/working_model");

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
     * @property {Object} workingId - workingId that should be verified
     */
    /**
     * Dispatch to queue
     * @param {DispatchPayload} obj - dispatch payload
     */
    async dispatchToQueue({ db, data, workingId }) {
        const working_model = new WorkingModel(db);
        const { salary } = await working_model.getWorkingsById(workingId);
        if (!salary) {
            throw Error("Validation failed");
        }
        await super.dispatchToQueue(data);
    }
}

module.exports = CreateSalaryEvent;
