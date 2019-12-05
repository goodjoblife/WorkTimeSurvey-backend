const _redis = require("./redis");
const permission = require("./search-permission");

function _checkPermission(mongodb, redisdb, user_id) {
    return permission
        .resolveSearchPermission(mongodb, user_id)
        .then(hasSearchPermission => {
            if (hasSearchPermission === true) {
                return _redis
                    .redisSetPermission(redisdb, `${user_id.toString()}`)
                    .catch(() => {})
                    .then(() => true);
            }
            return false;
        });
}

/*
 * @param mongodb mongo db
 * @param redisdb redis db
 * @param user_id ObjectId
 *
 * @fulfilled true || false
 * @rejected  error
 */
function cachedSearchPermissionAuthorization(mongodb, redisdb, user_id) {
    return _redis.redisGetPermission(redisdb, `${user_id.toString()}`).then(
        hasPermission => {
            if (hasPermission === true) {
                return true;
            }
            return _checkPermission(mongodb, redisdb, user_id);
        },
        () => _checkPermission(mongodb, redisdb, user_id)
    );
}

module.exports = {
    cachedSearchPermissionAuthorization,
};
