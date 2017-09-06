const redis = require("redis");

/*
 * The function will return a middleware that ships the redis_client connection.
 * @param url the redis url string
 */
function expressRedisDb(url) {
    const redis_client = redis.createClient({ url });

    redis_client.on("error", err => {});

    return (req, res, next) => {
        req.redis_client = redis_client;
        next();
    };
}

module.exports = { expressRedisDb };
