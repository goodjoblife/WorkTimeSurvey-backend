const redis = require('redis');

function expressRedisDb(url) {
    const redis_client = redis.createClient({'url': url});

    redis_client.on('error', (err) => {
    });

    return (req, res, next) => {
        req.redis_client = redis_client;
        next();
    };
}

module.exports = {expressRedisDb};
