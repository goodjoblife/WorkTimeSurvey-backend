module.exports = db =>
    Promise.all([
        db.collection("reports").createIndex({ ref: 1 }),
        db.collection("reports").createIndex({ created_at: -1 }),
        db.collection("reports").createIndex({ reason_category: 1 }),
        db
            .collection("reports")
            .createIndex({ user_id: 1, ref: 1 }, { unique: true }),
    ]);
