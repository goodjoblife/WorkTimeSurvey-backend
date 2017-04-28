module.exports = (db) => {
    return Promise.all([
        db.collection('experience_likes').createIndex({user: 1, experience_id: 1}, {unique: true}),
    ]);
};
