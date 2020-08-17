const ObjectId = require("mongodb").ObjectId;
const RewardEvent = require("./RewardEvent");
const { unlockSalaryWorkTime } = require("../EventType");
const User = require("../../../models/schemas/user");
const SalaryWorkTimeModel = require("../../../models/working_model");
const rewardConfig = require("../reward_config");

// 解鎖一筆薪資工時
class UnlockSalaryWorkTimeEvent extends RewardEvent {
    constructor(userId) {
        super({
            userId,
            eventName: unlockSalaryWorkTime,
            points: rewardConfig[unlockSalaryWorkTime].points,
        });
    }

    /**
     * 執行解鎖一篇職場經驗
     * @param {object} db
     * @param {ObjectId} salaryWorkTimeId
     */
    async exec({ db, salaryWorkTimeId }) {
        // 檢查使用者是否存在
        const user = await User.findById(this.userId);
        if (!user) {
            throw Error("使用者不存在");
        }

        // 確認需要多少點數
        const requiredPoints = rewardConfig[unlockSalaryWorkTime].points;

        // 確認使用者是否有足夠點數
        if (user.points < requiredPoints) {
            throw new Error("點數不足");
        }

        // 確認該篇文章是否存在
        const salaryWorkTimeModel = new SalaryWorkTimeModel(db);
        const salaryWorkTime = await salaryWorkTimeModel.getWorkingsById(
            salaryWorkTimeId
        );
        if (!salaryWorkTime) {
            throw Error("該筆薪資工時不存在");
        }

        // 確認該使用者是否已經解鎖過
        const hasUnlocked = user.unlocked_salary_work_times.some(doc => {
            return `${doc._id}` === `${salaryWorkTimeId}`;
        });
        if (hasUnlocked) {
            throw new Error("已經解鎖該筆薪資工時");
        }

        // 進行解鎖
        user.unlocked_salary_work_times.splice(0, 0, {
            _id: ObjectId(salaryWorkTimeId),
            created_at: new Date(),
        });
        await user.save();

        // 執行點數事件（新增 userPointEvent，更新 user.points）
        return await super.exec({ salaryWorkTimeId });
    }
}

module.exports = UnlockSalaryWorkTimeEvent;
