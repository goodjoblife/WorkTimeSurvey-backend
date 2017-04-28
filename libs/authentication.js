const facebook = require('./facebook');
const _redis = require('./redis');

/*
 * 透過 access_token 取得身份（有 cache ）
 *
 * @param mongodb      mongodb.Db
 * @param redis_client redis_client
 * @param access_token string
 *
 * @fulfilled User
 * @rejected  error, if unauthenticated
 */
function cachedFacebookAuthentication(mongodb, redis_client, access_token) {
    function facebookAuth(redis_client, access_token) {
        return facebook.accessTokenAuth(access_token)
            .then(account => {
                return _redis.redisSetFB(redis_client, access_token, account).catch(err => {}).then(() => account);
            });
    }

    return _redis.redisGetFB(redis_client, access_token).then(account => {
        if (account === null) {
            return facebookAuth(redis_client, access_token);
        } else {
            return account;
        }
    }, err => {
        return facebookAuth(redis_client, access_token);
    })
    .then(account => {
        const facebook_id = account.id;
        return mongodb.collection('users').findOneAndUpdate(
            {
                facebook_id,
            },
            {
                $setOnInsert: {
                    facebook_id,
                    facebook: account,
                },
            },
            {
                upsert: true,
                returnOriginal: false,
            }
        );
    })
    .then(result => result.value);
}

module.exports = {
    cachedFacebookAuthentication,
};
