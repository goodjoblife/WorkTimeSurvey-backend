const _redis = require('./redis');
const permission = require('./search-permission');

/*
 * @param mongodb mongo db
 * @param redisdb redis db
 * @param user    {id, type}
 *
 * @fulfilled true || false
 * @rejected  error
 */
function cachedSearchPermissionAuthorization(mongodb, redisdb, user) {
    function checkPermission(Mongodb, Redisdb, User) {
        return permission
            .resolveSearchPermission(Mongodb, User)
            .then((hasSearchPermission) => {
                if (hasSearchPermission === true) {
                    return _redis
                        .redisSetPermission(Redisdb, `${user.type}_${user.id}`)
                        .catch((err) => {}).then(() => true);
                }
                return false;
            });
    }

    return _redis.redisGetPermission(redisdb, `${user.type}_${user.id}`).then((hasPermission) => {
        if (hasPermission === true) {
            return true;
        }
        return checkPermission(mongodb, redisdb, user);
    }, err => checkPermission(mongodb, redisdb, user));
}

module.exports = {
    cachedSearchPermissionAuthorization,
};
