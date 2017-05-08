module.exports = (db) => {
    return db.collection('replies').createIndex({experience_id: 1});
};
