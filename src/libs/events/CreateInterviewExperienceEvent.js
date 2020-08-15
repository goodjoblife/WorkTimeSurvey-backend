const Event = require("./Event");
const { createInterviewExperience } = require("./EventType");
const ExperienceModel = require("../../models/experience_model");
const taskConfigMap = require("./task_config");

class CreateInterviewExperienceEvent extends Event {
    constructor(userId) {
        super({
            userId,
            eventName: createInterviewExperience,
            points: taskConfigMap[createInterviewExperience].points,
            maxRunCount: taskConfigMap[createInterviewExperience].maxRunCount,
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
            throw Error("該篇面試心得不存在");
        }
        return await super.exec({ experienceId });
    }
}

module.exports = CreateInterviewExperienceEvent;
