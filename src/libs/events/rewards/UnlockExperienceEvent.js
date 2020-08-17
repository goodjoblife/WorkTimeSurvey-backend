const ObjectId = require("mongodb").ObjectId;
const RewardEvent = require("./RewardEvent");
const { unlockExperience } = require("../EventType");
const User = require("../../../models/schemas/user");
const ExperienceModel = require("../../../models/experience_model");
const rewardConfig = require("../reward_config");

// 解鎖一篇職場經驗
class UnlockExperienceEvent extends RewardEvent {
    constructor(userId) {
        super({
            userId,
            eventName: unlockExperience,
            points: rewardConfig[unlockExperience].points,
        });
    }

    /**
     * 執行解鎖一篇職場經驗
     * @param {object} db
     * @param {ObjectId} experienceId
     */
    async exec({ db, experienceId }) {
        // 檢查使用者是否存在
        const user = await User.findById(this.userId);
        if (!user) {
            throw Error("使用者不存在");
        }

        // 確認需要多少點數
        const requiredPoints = rewardConfig[unlockExperience].points;

        // 確認使用者是否有足夠點數
        if (user.points < requiredPoints) {
            throw new Error("點數不足");
        }

        // 確認該篇文章是否存在
        const experience_model = new ExperienceModel(db);
        if (!(await experience_model.isExist(experienceId))) {
            throw Error("該篇職場經驗不存在");
        }

        // 確認該使用者是否已經解鎖過
        const hasUnlocked = user.unlocked_experiences.some(exp => {
            return `${exp._id}` === `${experienceId}`;
        });
        if (hasUnlocked) {
            throw new Error("已經解鎖該篇文章");
        }

        // 進行解鎖
        user.unlocked_experiences.splice(0, 0, {
            _id: ObjectId(experienceId),
            created_at: new Date(),
        });
        await user.save();

        // 執行點數事件（新增 userPointEvent，更新 user.points）
        return await super.exec({ experienceId });
    }
}

module.exports = UnlockExperienceEvent;
