module.exports = (db) => {
    return Promise.all([
        db.collection('companies').createIndex({id: 1}),
        db.collection('companies').createIndex({name: 1}),
        db.collection('companies').createIndex({capital: -1}),
        db.collection('companies').createIndex({type: -1}),
    ]);
}
