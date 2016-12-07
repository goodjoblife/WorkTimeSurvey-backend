const HttpError = require('./errors').HttpError;

function redisLookUp(user_id, redis) {
    return new Promise((resolve, reject) => {
        redis.get(user_id, (err, reply) => {
            if (err) {
                reject(err);
            } else {
                resolve(reply);
            }
        });
    });
}

function redisInsert(user_id, redis) {
    return new Promise((resolve, reject) => {
        redis.set(user_id, true, (err, reply) => {
            if (err) {
                reject(err);
            } else {
                resolve(reply);
            }
        });
    });
}

function getDataNumOfUser(user_id, db) {
    return db.collection('authors')
        .find({_id: {id: user_id, type: 'facebook'}})
        .count();
}

function getRefNumOfUser(user_id, db) {
    return db.collection('references')
        .find({user: {id: user_id, type: 'facebook'}})
        .count();
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
            return Promise.resolve();
        } else {
            return Promise.reject("User does not meet authorization level");
        }
    }, Promise.reject);
}

module.exports = (request, response, next) => {
    // redis look up
    redisLookUp(request.user_id, request.redis_client).
    // proceed if user found in cache
    then(Promise.resolve,
    err => {
        // validate user if user not found in cache
        return hasSearchPermission(request.user_id, request.db)
        // write authorized user into cache for later access
        .then(() => redisInsert(request.user_id, request.redis_client), Promise.reject);
    })
    // proceed or throw error
    .then(() => {
        next();
    },
    err => {
        throw new HttpError(403, err);
    });
};
