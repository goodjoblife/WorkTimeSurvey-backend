const { unlockExperience, unlockSalaryWorkTime } = require("./EventType");

const taskConfigMap = {
    [unlockExperience]: {
        title: "解鎖面試、工作心得",
        description: "每篇 100 積分",
        points: 1,
    },
    [unlockSalaryWorkTime]: {
        title: "解鎖一筆薪水、加班資料",
        description: "每筆 50 積分",
        points: 1,
    },
};

module.exports = taskConfigMap;
