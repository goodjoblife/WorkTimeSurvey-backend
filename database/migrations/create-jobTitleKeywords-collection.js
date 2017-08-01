module.exports = (db) => {
    return db.createCollection("job_title_keywords", {
        capped: true,
        size: 6000000,
        max: 5000,
    })
    .then(() => {
        return db.collection('job_title_keywords').createIndex({
            word: 1,
        });
    });
};
