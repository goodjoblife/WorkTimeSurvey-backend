const resolveSearchPermission = require('../libs/search-permission').resolveSearchPermission;
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
                    reject('Incorrect key-value in redis');
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
                throw 'User does not meet authorization level';
            }
        });
    })
    // proceed or throw error
    .then(() => {
        next();
    }, err => {
        next(new HttpError('Forbidden', 403));
    });
};
