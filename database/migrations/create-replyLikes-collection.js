module.exports = (db) => {
    return Promise.all([
        db.collection('reply_likes').createIndex({user: 1, reply_id: 1}, {unique: true}),
        db.collection('reply_likes').createIndex({user: 1, experience_id: 1}),
    ]);
};
