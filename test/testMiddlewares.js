const middlewares = require('../middlewares');
const assert = require('chai').assert;

describe('Redis middleware', function() {
    it('request should have property redis_client', function(done) {
        const middleware = middlewares.expressRedisDb('');

        const req = {};
        middleware(req, {}, function() {
            try {
                assert.property(req, 'redis_client');
                done();
            } catch (err) {
                done(err);
            }
        });
    });
});
