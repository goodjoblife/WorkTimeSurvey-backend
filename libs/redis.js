
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

function redisGetFB(db, key) {
    return getAsync(db, 'fb_' + key).then(account_string => {
        if (account_string === null) {
            return null;
        } else {
            return JSON.parse(account_string);
        }
    });
}

function redisSetFB(db, key, value) {
    return setAsync(db, 'fb_' + key, JSON.stringify(value));
}

module.exports = {
    getAsync,
    setAsync,
    expireAsync,
    redisGetFB,
    redisSetFB,
};
