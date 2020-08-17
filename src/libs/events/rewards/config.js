const { unlockExperience, unlockSalaryWorkTime } = require("./EventType");

const rewardConfigMap = {
    [unlockExperience]: {
        title: "解鎖面試、工作心得",
        description: "每篇 100 積分",
        points: 100,
    },
    [unlockSalaryWorkTime]: {
        title: "解鎖一筆薪水、加班資料",
        description: "每筆 50 積分",
        points: 50,
    },
};

module.exports = rewardConfigMap;
