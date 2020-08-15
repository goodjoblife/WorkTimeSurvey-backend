const Event = require("./Event");
const { shareWebsite } = require("./EventType");
const taskConfigMap = require("./task_config");

class ShareWebsite extends Event {
    constructor(userId) {
        super({
            userId,
            taskName: shareWebsite,
            points: taskConfigMap[shareWebsite].points,
            maxRunCount: taskConfigMap[shareWebsite].maxRunCount,
        });
    }
}

module.exports = ShareWebsite;
