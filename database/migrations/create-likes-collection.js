module.exports = (db) => Promise.all([
    db.collection('likes').createIndex({ user_id: 1, ref: 1 }, { unique: true }),
]);
