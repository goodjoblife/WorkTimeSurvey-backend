const FB_TOKEN_EXPIRE_TIME = 1800; // 30 mins = 30*60
const SEARCH_PERMISSION_EXPIRE_TIME = 172800; // 2 days = 2*24*60*60

/*
 * @param db  redis client
 * @param key string
 *
 * @fulfilled reply
 * @rejected  error
 */
function getAsync(db, key) {
    return new Promise((resolve, reject) => {
        db.get(key, (err, reply) => {
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
        db.set(key, value, (err, reply) => {
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
 * @param time(seconds)  integer
 *
 * @fulfilled reply
 * @rejected  error
 */
function expireAsync(db, key, time) {
    return new Promise((resolve, reject) => {
        db.expire(key, time, (err, reply) => {
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
    return getAsync(db, `fb_${key}`).then(account_string => {
        if (account_string === null) {
            return null;
        }
        return JSON.parse(account_string);
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
    return setAsync(db, `fb_${key}`, JSON.stringify(value)).then(() =>
        expireAsync(db, `fb_${key}`, FB_TOKEN_EXPIRE_TIME)
    );
}

/*
 * @param db  redis client
 * @param key string
 *
 * @fulfilled true || false
 * @rejected  error
 */
function redisGetPermission(db, key) {
    return getAsync(db, `permission_${key}`).then(reply => {
        if (reply) {
            return true;
        }
        return false;
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
    return setAsync(db, `permission_${key}`, "1").then(() =>
        expireAsync(db, `permission_${key}`, SEARCH_PERMISSION_EXPIRE_TIME)
    );
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
