module.exports = (db) =>
    db.createCollection("popular_experience_logs", {
        capped: true,
        size: 300000,
        max: 1000,
    });
