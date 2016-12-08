const HttpError = require('./errors').HttpError;

function redisLookUp(user_id, redis) {
    return new Promise((resolve, reject) => {
        redis.get(user_id, (err, reply) => {
            if (err) {
                reject(err);
            } else {
                if (reply) {
                    resolve(reply);
                } else {
                    reject('Not found in Redis');
                }
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
    return new Promise((resolve, reject) => {
        db.collection('authors')
        .find({_id: {id: user_id, type: 'facebook'}})
        .toArray()
        .then(results => {
            if (results.length==0) {
                resolve(0);
            } else {
                resolve(results[0].queries_count);
            }
        }, err => {
            reject(err);
        });
    });
}

function getRefNumOfUser(user_id, db) {
    return new Promise((resolve, reject) => {
        db.collection('references')
        .find({user: {id: user_id, type: 'facebook'}})
        .toArray()
        .then(results => {
            if (results.length == 0) {
                resolve(0);
            } else {
                resolve(results[0].count);
            }
        }, err => {
            reject(err);
        });
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
            return Promise.resolve();
        } else {
            return Promise.reject("User does not meet authorization level");
        }
    }, err => {
        return Promise.reject(err);
    });
}

module.exports = (request, response, next) => {
    // redis look up
    redisLookUp(request.user_id, request.redis_client).
    // proceed if user found in cache
    then(
    () => {
        return Promise.resolve();
    }, err => {
        // validate user if user not found in cache
        return hasSearchPermission(request.user_id, request.db)
        // write authorized user into cache for later access
        .then(() => {
            return redisInsert(request.user_id, request.redis_client);
        }, err => {
            return Promise.reject(err);
        });
    })
    // proceed or throw error
    .then(() => {
        next();
    }, err => {
        throw new HttpError(403, err);
    });
};
