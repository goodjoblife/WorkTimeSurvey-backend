const User = require("../../models/schemas/userModel");
const {
    COMPLETED,
    UserPointEvent,
} = require("../../models/schemas/userPointEvent");

class Event {
    constructor({ userId, eventName, points, maxRunCount }) {
        this.userId = userId;
        this.eventName = eventName;
        this.points = points;
        this.maxRunCount = maxRunCount;
    }

    async exec(docId) {
        const userTaskCount =
            (await UserPointEvent.countDocuments({
                userId: this.userId,
                eventName: this.eventName,
            })) || 0;

        // 執行次數達上限，無法給獎勵，throw error
        if (userTaskCount >= this.maxRunCount) {
            throw Error(
                `${this.eventName} can only be executed by at most ${
                    this.maxRunCount
                } times.`
            );
        }

        // 給予獎勵
        const user = await User.findByIdAndUpdate(this.userId, {
            $inc: { points: this.points },
        });
        await user.save();

        // 建立event
        await UserPointEvent.create({
            user_id: this.userId,
            event_name: this.eventName,
            doc_id: docId,
            status: COMPLETED,
            points: this.points,
            createdAt: new Date(),
            completedAt: new Date(),
        });
    }
}

module.exports = Event;
