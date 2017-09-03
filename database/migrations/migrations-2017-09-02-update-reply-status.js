module.exports = (db) => db.collection('replies')
    .updateMany(
        { status: { $exists: false } },
        { $set: { status: 'published' } }
    );
