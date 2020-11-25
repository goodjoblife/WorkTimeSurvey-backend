const TaskEvent = require("./TaskEvent");
const { oldUserContribute } = require("./EventType");
const taskConfigMap = require("./config");

class ShareWebsiteEvent extends TaskEvent {
    constructor(userId) {
        super({
            userId,
            taskName: oldUserContribute,
            maxRunCount: taskConfigMap[oldUserContribute].maxRunCount,
        });
    }

    async exec(points, snapshot) {
        // points for this event is dynamic,
        // we update amount of points here
        this.points = points;
        await super.exec(snapshot);
    }
}

module.exports = ShareWebsiteEvent;
