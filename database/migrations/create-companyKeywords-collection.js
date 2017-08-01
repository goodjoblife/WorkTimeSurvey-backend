module.exports = (db) => {
    return db.createCollection("company_keywords", {
        capped: true,
        size: 6000000,
        max: 5000,
    })
    .then(() => {
        return db.collection('company_keywords').createIndex({
            word: 1,
        });
    });
};
