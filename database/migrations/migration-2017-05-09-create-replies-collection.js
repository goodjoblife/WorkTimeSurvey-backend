module.exports = (db) => {
    return Promise.all([
        db.collection('replies').createIndex({experience_id: 1}),
        db.collection('replies').createIndex({created_at: -1}),
    ]);
};
