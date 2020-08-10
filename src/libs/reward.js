const { User } = require("../models");
const {
    UserPointEvent,
    COMPLETED,
} = require("../models/schemas/userPointEvent");
const taskConfigMap = require("../libs/events/task_config");

/**
 * 在指定 API 發生時（例如：填寫面試經驗 mutation createInterviewExperience），直接觸發兌換獎勵
 * @param {String} userId user id
 * @param {String} eventName 任務名稱
 * @param {ObjectId} docId 要解鎖的collection之對應的document id
 */
const checkoutReward = async (userId, eventName, docId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw Error("User not found");
    }
    const requirePoints = taskConfigMap[eventName].points;
    const userPoints = user.points || 0;
    if (userPoints < requirePoints) {
        throw Error("No enough points left");
    }
    const rewardRecord = await UserPointEvent.find({
        user_id: user._id,
        event_name: eventName,
        doc_id: docId,
    });
    if (rewardRecord) {
        throw Error("User has already had permission.");
    }
    user.points -= requirePoints;
    await user.save();

    await new UserPointEvent({
        user_id: userId,
        event_name: eventName,
        doc_id: docId,
        status: COMPLETED,
        points: requirePoints,
        created_at: new Date(),
        completed_at: new Date(),
    }).save();
};

module.exports = {
    checkoutReward,
};
