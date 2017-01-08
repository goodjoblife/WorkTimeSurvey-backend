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
    function checkPermission(mongodb, redisdb, user) {
        return permission.resolveSearchPermission(mongodb, user).then(hasSearchPermission => {
            if (hasSearchPermission === true) {
                return _redis.redisSetPermission(redisdb, `${user.type}_${user.id}`).catch(err => {}).then(() => true);
            } else {
                return false;
            }
        });

    }

    return _redis.redisGetPermission(redisdb, `${user.type}_${user.id}`).then(hasPermission => {
        if (hasPermission === true) {
            return true;
        } else {
            return checkPermission(mongodb, redisdb, user);
        }
    }, err => {
        return checkPermission(mongodb, redisdb, user);
    });
}

module.exports = {
    cachedSearchPermissionAuthorization,
};
