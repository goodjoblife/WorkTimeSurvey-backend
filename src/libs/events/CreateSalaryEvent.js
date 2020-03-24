const Event = require("./Event");
const { createSalary } = require("./EventType");

class CreateSalaryEvent extends Event {
    constructor(userId) {
        super({
            userId,
            taskName: createSalary,
        });
    }
}

module.exports = CreateSalaryEvent;
