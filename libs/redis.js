/*
 * @param db  redis client
 * @param key string
 *
 * @fulfilled reply
 * @rejected  error
 */
function getAsync(db, key) {
    return new Promise((resolve, reject) => {
        db.get(key, function(err, reply) {
            if (err) {
                reject(err);
            } else {
                resolve(reply);
            }
        });
    });
}

/*
 * @param db    redis client
 * @param key   string
 * @param value string
 *
 * @fulfilled reply
 * @rejected  error
 */
function setAsync(db, key, value) {
    return new Promise((resolve, reject) => {
        db.set(key, value, function(err, reply) {
            if (err) {
                reject(err);
            } else {
                resolve(reply);
            }
        });
    });
}

function expireAsync(db, key, time) {
    return new Promise((resolve, reject) => {
        db.expire(key, time, function(err, reply) {
            if (err) {
                reject(err);
            } else {
                resolve(reply);
            }
        });
    });
}

/*
 * @param db  redis client
 * @param key string
 *
 * @fulfilled {id, name} || null
 * @rejected  error
 */
function redisGetFB(db, key) {
    return getAsync(db, 'fb_' + key).then(account_string => {
        if (account_string === null) {
            return null;
        } else {
            return JSON.parse(account_string);
        }
    });
}

/*
 * @param db    redis client
 * @param key   string
 * @param value {id, name}
 *
 * @fulfilled reply
 * @rejected  error
 */
function redisSetFB(db, key, value) {
    return setAsync(db, 'fb_' + key, JSON.stringify(value));
}

/*
 * @param db  redis client
 * @param key string
 *
 * @fulfilled true || false
 * @rejected  error
 */
function redisGetPermission(db, key) {
    return getAsync(db, 'permission_' + key).then(reply => {
        if (reply) {
            return true;
        } else {
            return false;
        }
    });
}

/*
 * @param db  redis client
 * @param key string
 *
 * @fulfilled reply
 * @rejected  error
 */
function redisSetPermission(db, key) {
    return setAsync(db, 'permission_' + key, '1');
}
module.exports = {
    getAsync,
    setAsync,
    expireAsync,
    redisGetFB,
    redisSetFB,
    redisGetPermission,
    redisSetPermission,
};
