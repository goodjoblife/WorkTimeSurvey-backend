const redis = require("redis");

/*
 * The function will return a middleware that ships the redis_client connection.
 * @param url the redis url string
 */
module.exports = function(url) {
    const redis_client = redis.createClient({ url });

    redis_client.on("error", () => {});

    return function expressRedisDb(req, res, next) {
        req.redis_client = redis_client;
        next();
    };
};
