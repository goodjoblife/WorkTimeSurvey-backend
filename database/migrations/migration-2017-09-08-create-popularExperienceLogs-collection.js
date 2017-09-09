module.exports = db =>
    db
        .createCollection("popular_experience_logs", {
            capped: true,
            size: 100000,
            max: 100,
        })
        .then(() =>
            db.collection("popular_experience_logs").createIndex({
                experience_id: 1,
                user_id: 1,
                action_type: 1,
            })
        );
