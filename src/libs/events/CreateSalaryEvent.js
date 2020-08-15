const Event = require("./Event");
const { createSalary } = require("./EventType");
const WorkingModel = require("../../models/working_model");
const taskConfigMap = require("./task_config");

class CreateSalaryEvent extends Event {
    constructor(userId) {
        super({
            userId,
            taskName: createSalary,
            points: taskConfigMap[createSalary].points,
            maxRunCount: taskConfigMap[createSalary].maxRunCount,
        });
    }

    /**
     * @typedef {Object} DispatchPayload
     * @property {Object} db - database object
     * @property {Object} workingId - workingId that should be verified
     */
    /**
     * Dispatch to queue
     * @param {DispatchPayload} obj - dispatch payload
     */
    async exec({ db, workingId }) {
        const working_model = new WorkingModel(db);
        const { salary } = await working_model.getWorkingsById(workingId);
        if (!salary) {
            throw Error("Validation failed");
        }
        await super.exec(workingId);
    }
}

module.exports = CreateSalaryEvent;
