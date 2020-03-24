const Event = require("./Event");
const { shareWebsiteToFB } = require("./EventType");

class ShareWebsiteToFB extends Event {
    constructor(userId) {
        super({
            userId,
            taskName: shareWebsiteToFB,
        });
    }
}

module.exports = ShareWebsiteToFB;
