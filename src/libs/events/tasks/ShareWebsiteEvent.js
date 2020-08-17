const TaskEvent = require("./TaskEvent");
const { shareWebsite } = require("./EventType");
const taskConfigMap = require("./config");

class ShareWebsiteEvent extends TaskEvent {
    constructor(userId) {
        super({
            userId,
            taskName: shareWebsite,
            points: taskConfigMap[shareWebsite].points,
            maxRunCount: taskConfigMap[shareWebsite].maxRunCount,
        });
    }
}

module.exports = ShareWebsiteEvent;
