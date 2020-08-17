const TaskEvent = require("./TaskEvent");
const { createWorkExperience } = require("./EventType");
const ExperienceModel = require("../../../models/experience_model");
const taskConfigMap = require("./config");

class CreateWorkExperienceEvent extends TaskEvent {
    constructor(userId) {
        super({
            userId,
            eventName: createWorkExperience,
            points: taskConfigMap[createWorkExperience].points,
            maxRunCount: taskConfigMap[createWorkExperience].maxRunCount,
        });
    }

    /**
     * 執行這個事件
     * @property {Object} db - database object
     * @property {Object} experienceId - experienceId that should be verified
     */
    async exec({ db, experienceId }) {
        const experience_model = new ExperienceModel(db);
        if (!(await experience_model.isExist(experienceId))) {
            throw Error("該篇工作心得不存在");
        }
        return await super.exec({ experienceId });
    }
}

module.exports = CreateWorkExperienceEvent;
