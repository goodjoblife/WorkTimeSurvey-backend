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
    function facebookAuth(Redis_client, Access_token) {
        return facebook
            .accessTokenAuth(Access_token)
            .then(account => _redis.redisSetFB(Redis_client, Access_token, account)
                    .catch((err) => {})
                    .then(() => account));
    }

    return _redis.redisGetFB(redis_client, access_token).then((account) => {
        if (account === null) {
            return facebookAuth(redis_client, access_token);
        }
        return account;
    }, err => facebookAuth(redis_client, access_token))
    .then((account) => {
        const facebook_id = account.id;

        return mongodb.collection('users').findOne({ facebook_id })
            .then((user) => {
                if (user) {
                    return user;
                }

                const new_user = {
                    facebook_id,
                    facebook: account,
                };

                // TODO enhance: if Duplicated Key, we can find the user again
                return mongodb.collection('users').insertOne(new_user).then(() => new_user);
            });
    });
}

module.exports = {
    cachedFacebookAuthentication,
};
