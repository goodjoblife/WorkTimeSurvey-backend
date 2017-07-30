module.exports = (db) => Promise.all([
    db.collection('recommendations').createIndex({ user: 1 }, { unique: true }),
]);
