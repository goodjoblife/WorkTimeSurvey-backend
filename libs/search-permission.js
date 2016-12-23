function getDataNumOfUser(user_id, db) {
    return db.collection('authors')
    .find({_id: {id: user_id, type: 'facebook'}})
    .toArray()
    .then(results => {
        if (results.length==0) {
            return 0;
        } else {
            return results[0].queries_count || 0;
        }
    });
}

function getRefNumOfUser(user_id, db) {
    return db.collection('references')
    .find({user: {id: user_id, type: 'facebook'}})
    .toArray()
    .then(results => {
        if (results.length == 0) {
            return 0;
        } else {
            return results[0].count || 0;
        }
    });
}

function resolveSearchPermission(user_id, db) {
    // get required values
    return Promise.all([
        getDataNumOfUser(user_id, db),
        getRefNumOfUser(user_id, db),
    ])
    // determine authorization
    .then(values => {
        const sum = values.reduce((a, b) => a+b);
        return sum > 0;
    });
}

module.exports = {
    getDataNumOfUser,
    getRefNumOfUser,
    resolveSearchPermission,
};
