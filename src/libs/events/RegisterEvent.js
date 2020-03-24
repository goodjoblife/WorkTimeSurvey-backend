const Event = require("./Event");
const { register } = require("./EventType");

class RegisterEvent extends Event {
    constructor(userId) {
        super({
            userId,
            taskName: register,
        });
    }
}

module.exports = RegisterEvent;
