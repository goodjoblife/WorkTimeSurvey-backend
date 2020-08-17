const User = require("../../../models/schemas/user");
const {
    COMPLETED,
    UserPointEvent,
} = require("../../../models/schemas/userPointEvent");

class TaskEvent {
    constructor({ userId, eventName, points, maxRunCount }) {
        this.userId = userId;
        this.eventName = eventName;
        this.points = points;
        this.maxRunCount = maxRunCount;
    }

    async exec(snapshot) {
        // 取得該使用者該事件的執行次數
        const eventCount =
            (await UserPointEvent.countDocuments({
                user_id: this.userId,
                event_name: this.eventName,
            })) || 0;

        // 次數達上限，無法執行該事件。（若 maxRunCount = 0 代表無限制次數）
        if (this.maxRunCount !== 0 && eventCount >= this.maxRunCount) {
            throw Error(
                `${this.eventName} 只能被執行最多 ${this.maxRunCount} 次`
            );
        }

        // 增加或減少積分
        const user = await User.findByIdAndUpdate(this.userId, {
            $inc: { points: this.points },
        });
        await user.save();

        // 建立 user point event
        await UserPointEvent.create({
            user_id: this.userId,
            event_name: this.eventName,
            snapshot,
            status: COMPLETED,
            points: this.points,
            created_at: new Date(),
        });
    }
}

module.exports = TaskEvent;
