const HttpError = require('../libs/errors').HttpError;

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
        if (sum > 0) {
            return true;
        } else {
            return false;
        }
    });
}

module.exports = (request, response, next) => {
    // redis look up
    redisLookUp(request.user_id, request.redis_client)
    // proceed if user found in cache
    .catch(err => {
        // validate user if user not found in cache
        return resolveSearchPermission(request.user_id, request.db)
        // write authorized user into cache for later access
        .then(hasSearchPermission => {
            if (hasSearchPermission) {
                return redisInsert(request.user_id, request.redis_client).catch(err => {});
            } else {
                return Promise.reject('User does not meet authorization level');
            }
        });
    })
    // proceed or throw error
    .then(() => {
        next();
    }, err => {
        throw new HttpError('Forbidden', 403);
    });
};
