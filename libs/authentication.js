const facebook = require('./facebook');
const _redis = require('./redis');

/*
 * @param db RedisClient
 * @param access_token string
 */
function cachedFacebookAuthentication(db, access_token) {
    function facebookAuth() {
        return facebook.accessTokenAuth(access_token)
            .then(account => {
                return _redis.redisSetFB(db, access_token, account).catch(err => {}).then(() => account);
            });
    }

    return _redis.redisGetFB(db, access_token).then(account => {
        if (account === null) {
            return facebookAuth();
        } else {
            return account;
        }
    }, err => {
        return facebookAuth();
    });
}

module.exports = {
    cachedFacebookAuthentication,
}
