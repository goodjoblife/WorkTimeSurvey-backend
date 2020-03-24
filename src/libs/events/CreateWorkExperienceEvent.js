const Event = require("./Event");
const { createWorkExperience } = require("./EventType");

class CreateWorkExperienceEvent extends Event {
    constructor(userId) {
        super({
            userId,
            taskName: createWorkExperience,
        });
    }
}

module.exports = CreateWorkExperienceEvent;
