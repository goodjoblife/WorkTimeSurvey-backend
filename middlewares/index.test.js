const chai = require('chai');
chai.use(require("chai-as-promised"));

const assert = chai.assert;

const middlewares = require('./');

describe('Redis middleware', () => {
    it('request should have property redis_client', (done) => {
        const middleware = middlewares.expressRedisDb('');

        const req = {};
        middleware(req, {}, () => {
            try {
                assert.property(req, 'redis_client');
                done();
            } catch (err) {
                done(err);
            }
        });
    });
});
