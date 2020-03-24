const Event = require("./Event");
const { createInterviewExperience } = require("./EventType");

class CreateInterviewExperienceEvent extends Event {
    constructor(userId) {
        super({
            userId,
            taskName: createInterviewExperience,
        });
    }
}

module.exports = CreateInterviewExperienceEvent;
