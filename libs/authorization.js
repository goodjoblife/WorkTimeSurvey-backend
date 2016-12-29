const resolveSearchPermission = require('./search-permission').resolveSearchPermission;

function redisLookUp(user_id, redis) {
    return new Promise((resolve, reject) => {
        redis.get('permission_' + user_id, (err, reply) => {
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
        redis.set('permission_' + user_id, true, (err, reply) => {
            if (err) {
                reject(err);
            } else {
                resolve(reply);
            }
        });
    });
}

function cachedSearchPermissionAuthorization(db, user) {
    // redis look up
    return redisLookUp(user.id, db)
    // proceed if user found in cache
    .catch(err => {
        // validate user if user not found in cache
        return resolveSearchPermission(user.id, db)
        // write authorized user into cache for later access
        .then(hasSearchPermission => {
            if (hasSearchPermission) {
                return redisInsert(user.id, db).catch(err => {});
            } else {
                throw 'User does not meet authorization level';
            }
        });
    });
}

module.exports = {
    cachedSearchPermissionAuthorization,
};
