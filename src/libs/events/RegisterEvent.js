const Event = require("./Event");
const { register } = require("./EventType");
const User = require("../../models/schemas/userModel");

class RegisterEvent extends Event {
    constructor(userId) {
        super({
            userId,
            taskName: register,
        });
    }

    /**
     * @typedef {Object} DispatchPayload
     * @property {Object} data - consist of snapshot and eventStatus
     * @property {Object} userId - userId that should be verified
     */
    /**
     * Dispatch to queue
     * @param {DispatchPayload} obj - dispatch payload
     */
    async dispatchToQueue({ data, userId }) {
        const user = await User.findById(userId);
        if (!user) {
            throw Error("Validation error.");
        }
        await super.dispatchToQueue(data);
    }
}

module.exports = RegisterEvent;
