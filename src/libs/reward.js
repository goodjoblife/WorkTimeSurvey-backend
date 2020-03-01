const { User } = require("../models");
const { RewardRecord } = require("../models/schemas/rewardRecords");
const { PERMISSION } = require("../models/schemas/rewardRecords");

/**
 * 在指定 API 發生時（例如：填寫面試經驗 mutation createInterviewExperience），直接觸發兌換獎勵
 * @param {String} item 目前只有一種獎勵 `permission` ，即全站的觀看權限一段時間。之後才會有別的 item。
 * @param {Number} points 欲使用的點數
 * @param {String} userId user id
 */
const checkoutReward = async (item, points, userId) => {
    if (item !== PERMISSION) {
        throw Error("Invalid item");
    }
    const user = await User.findById(userId);
    if (!user) {
        throw Error("User not found");
    }
    const userPoints = user.points || 0;
    if (points < 0 || userPoints < points) {
        throw Error("Invalid points");
    }
    user.points -= points;
    const currPermissionExpiresAt = user.permissionExpiresAt || null;
    if (currPermissionExpiresAt < new Date()) {
        user.permissionExpiresAt = new Date(
            new Date().getTime() + points * 60 * 1000
        );
    } else {
        user.permissionExpiresAt = new Date(
            currPermissionExpiresAt.getTime() + points * 60 * 1000
        );
    }
    await new RewardRecord({
        user_id: userId,
        item: PERMISSION,
        points,
        created_at: new Date(),
        meta: {
            minutes: points,
        },
    }).save();
    await user.save();
};

module.exports = {
    checkoutReward,
};
