const chai = require('chai');
chai.use(require("chai-as-promised"));
const assert = chai.assert;

const redis = require('redis');
const _redis = require('../libs/redis');

describe('Redis Library', function() {
    describe('redisGetFB', function() {
        const redis_client = redis.createClient(process.env.REDIS_URL);

        before("Seed some data", function(done) {
            redis_client.set('fb_faketoken', '{"id":"1","name":"helloworld"}', done);
        });

        it('resolved if key exists', function() {
            return assert.becomes(_redis.redisGetFB(redis_client, 'faketoken'), {
                id: '1', name: 'helloworld',
            });
        });

        it('resolved null if key doesn\'t exist', function() {
            return assert.becomes(_redis.redisGetFB(redis_client, 'fakeToken'), null);
        });

        after(function(done) {
            redis_client.flushdb(done);
        });
    });

    describe('redisSetFB', function() {
        const redis_client = redis.createClient(process.env.REDIS_URL);

        it('set success', function() {
            const set = _redis.redisSetFB(redis_client, 'faketoken', {id: 1});
            return Promise.all([
                assert.isFulfilled(set),
                assert.becomes(set.then(() => _redis.redisGetFB(redis_client, 'faketoken')), {id: 1}),
            ]);
        });

        after(function(done) {
            redis_client.flushdb(done);
        });
    });
});
