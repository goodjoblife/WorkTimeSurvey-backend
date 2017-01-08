const facebook = require('./facebook');
const _redis = require('./redis');

/*
 * 透過 access_token 取得身份（有 cache ）
 *
 * @param db           redis_client
 * @param access_token string
 *
 * @fulfilled {id, name}
 * @rejected  error, if unauthenticated
 */
function cachedFacebookAuthentication(db, access_token) {
    function facebookAuth(db, access_token) {
        return facebook.accessTokenAuth(access_token)
            .then(account => {
                return _redis.redisSetFB(db, access_token, account).catch(err => {}).then(() => account);
            });
    }

    return _redis.redisGetFB(db, access_token).then(account => {
        if (account === null) {
            return facebookAuth(db, access_token);
        } else {
            return account;
        }
    }, err => {
        return facebookAuth(db, access_token);
    });
}

module.exports = {
    cachedFacebookAuthentication,
};
