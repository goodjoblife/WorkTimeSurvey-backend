module.exports = db => {
    const collecton = db.collection("experiences");

    return Promise.all([
        // 職稱與公司名稱會被搜尋
        collecton.createIndex({ company: 1 }),
        collecton.createIndex({ job_title: 1 }),
        // popularity 排序依據
        collecton.createIndex({ like_count: 1 }),
        collecton.createIndex({ reply_count: 1 }),
        // 最新
        collecton.createIndex({ created_at: -1 }),
    ]);
};
