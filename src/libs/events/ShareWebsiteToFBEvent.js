const Event = require("./Event");
const { shareWebsiteToFB } = require("./EventType");

class ShareWebsiteToFBEvent extends Event {
    constructor(userId) {
        super({
            userId,
            taskName: shareWebsiteToFB,
        });
    }
}

module.exports = ShareWebsiteToFBEvent;
