module.exports = (db) => Promise.all([
    db.collection('experiences').updateMany(
            { status: { $exists: false } },
            { $set: { status: 'published' } }
        ),
    db.collection('workings').updateMany(
            { status: { $exists: false } },
            { $set: { status: 'published' } }
        ),
]);
