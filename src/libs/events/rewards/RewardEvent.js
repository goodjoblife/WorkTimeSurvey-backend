const User = require("../../../models/schemas/user");
const {
    COMPLETED,
    UserPointEvent,
} = require("../../../models/schemas/userPointEvent");

class RewardEvent {
    constructor({ userId, eventName, points }) {
        this.userId = userId;
        this.eventName = eventName;
        this.points = points;
    }

    async exec(snapshot) {
        // 扣掉積分
        const user = await User.findByIdAndUpdate(this.userId, {
            $inc: { points: -1 * this.points },
        });
        await user.save();

        // 建立 user point event
        await UserPointEvent.create({
            user_id: this.userId,
            event_name: this.eventName,
            snapshot,
            status: COMPLETED,
            points: -1 * this.points,
            created_at: new Date(),
        });
    }
}

module.exports = RewardEvent;
