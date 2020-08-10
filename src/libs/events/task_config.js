const {
    createSalaryWorkTime,
    createInterviewExperience,
    createWorkExperience,
    shareWebsite,
} = require("./EventType");

const taskConfigMap = {
    [createSalaryWorkTime]: {
        title: "留下一筆薪資工時",
        description: "+ 100 積分",
        points: 1,
        maxRunCount: 0,
    },
    [createInterviewExperience]: {
        title: "寫一篇面試心得",
        description: "至少 + 100 積分",
        points: 1,
        maxRunCount: 0,
    },
    [createWorkExperience]: {
        title: "寫一篇工作心得",
        description: "至少 + 100 積分",
        points: 1,
        maxRunCount: 0,
    },
    [shareWebsite]: {
        title: "分享我們的網站",
        description: "+ 100 積分",
        points: 1,
        maxRunCount: 1,
    },
};

module.exports = taskConfigMap;
