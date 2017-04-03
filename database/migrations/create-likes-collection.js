module.exports = (db) => {
    return Promise.all([
        db.collection('likes').createIndex({user: 1, ref:1}, {unique: true}),
    ]);
}
