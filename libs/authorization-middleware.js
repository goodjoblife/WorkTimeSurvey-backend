const HttpError = require('./errors');

function redisLookUp(user_id) {
    return new Promise((resolve, reject) => {
        if (user_id) {
            resolve();
        } else {
            reject("Facebook ID not found in Redis");
        }
    });
}

function redisInsert(user_id) {
    return new Promise((resolve, reject) => {
        if (user_id) {
            resolve();
        } else {
            reject("Insertion failed");
        }
    });
}

function getDataNumOfUser(user_id, db) {
    return new Promise((resolve, reject) => {
        db.collection('workings')
            .find({'user_id': user_id})
            .count()
            .then(resolve, reject);
    });
}

function getRefNumOfUser(user_id, db) {
    return new Promise((resolve, reject) => {
        db.collection('workings')
            .find({'ref_user_id': user_id})
            .count()
            .then(resolve, reject);
    });
}

function hasSearchPermission(user_id, db) {
    // get required values
    return Promise.all([
        getDataNumOfUser(user_id, db),
        getRefNumOfUser(user_id, db),
    ])
    // determine authorization
    .then(values => {
        let sum = values.reduce((a, b) => a+b);
        if (sum > 0) {
            Promise.resolve();
        } else {
            Promise.reject("User does not meet authorization level");
        }
    }, Promise.reject);
}

module.exports = (request, response, next) => {
    // redis look up
    redisLookUp(user_id).
    // proceed if user found in cache
    then(Promise.resolve,
    err => {
        // validate user if user not found in cache
        return hasSearchPermission(request.user_id, request.db)
        // write authorized user into cache for later access
        .then(() => {
            return redisInsert(user_id);
        },
        Promise.reject);
    },
    Promise.reject)
    // proceed or throw error
    .then(() => {
        next();
    },
    err => {
        throw new HttpError(401, err);
    });
};
