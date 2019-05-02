module.exports = db =>
    Promise.all([
        db
            .collection("reply_likes")
            .createIndex({ user_id: 1, reply_id: 1 }, { unique: true }),
        db
            .collection("reply_likes")
            .createIndex({ user_id: 1, experience_id: 1 }),
    ]);
