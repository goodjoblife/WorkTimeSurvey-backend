const TaskEvent = require("./TaskEvent");
const { createSalaryWorkTime } = require("./EventType");
const WorkingModel = require("../../../models/working_model");
const taskConfigMap = require("./config");

class CreateSalaryEvent extends TaskEvent {
    constructor(userId) {
        super({
            userId,
            eventName: createSalaryWorkTime,
            points: taskConfigMap[createSalaryWorkTime].points,
            maxRunCount: taskConfigMap[createSalaryWorkTime].maxRunCount,
        });
    }

    /**
     * 執行這個事件
     * @property {Object} db - database object
     * @property {Object} experienceId - experienceId that should be verified
     */
    async exec({ db, salaryWorkTimeId }) {
        const working_model = new WorkingModel(db);
        const salary = await working_model.getWorkingsById(salaryWorkTimeId);
        if (!salary) {
            throw Error("該筆薪資工時不存在");
        }
        await super.exec({ salaryWorkTimeId });
    }
}

module.exports = CreateSalaryEvent;
