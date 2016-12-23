module.exports = (db) => {
    return Promise.all([
        db.collection('recommendations').createIndex({user: 1}, {unique: true}),
    ]);
}
