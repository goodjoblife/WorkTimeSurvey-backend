const chai = require('chai');
chai.use(require("chai-as-promised"));

const assert = chai.assert;

const redis = require('redis');
const config = require('config');
const _redis = require('./redis');

describe('Redis Library', () => {
    describe('redisGetFB', () => {
        const redis_client = redis.createClient(config.get('REDIS_URL'));

        before("Seed some data", (done) => {
            redis_client.set('fb_faketoken', '{"id":"1","name":"helloworld"}', done);
        });

        it('resolved if key exists', () => assert.becomes(_redis.redisGetFB(redis_client, 'faketoken'), {
            id: '1', name: 'helloworld',
        }));

        it('resolved null if key doesn\'t exist', () => assert.becomes(_redis.redisGetFB(redis_client, 'fakeToken'), null));

        after((done) => {
            redis_client.flushdb(done);
        });
    });

    describe('redisSetFB', () => {
        const redis_client = redis.createClient(config.get('REDIS_URL'));

        it('set success', () => {
            const set = _redis.redisSetFB(redis_client, 'faketoken', { id: 1 });
            return Promise.all([
                assert.isFulfilled(set),
                assert.becomes(set.then(() => _redis.redisGetFB(redis_client, 'faketoken')), { id: 1 }),
            ]);
        });

        after((done) => {
            redis_client.flushdb(done);
        });
    });

    describe('redisGetPermission', () => {
        const redis_client = redis.createClient(config.get('REDIS_URL'));

        before("Seed some data", (done) => {
            redis_client.set('permission_facebook_mark', '1', done);
        });

        it('resolved true if key exists', () => assert.becomes(_redis.redisGetPermission(redis_client, 'facebook_mark'), true));

        it('resolved false if key doesn\'t exist', () => assert.becomes(_redis.redisGetPermission(redis_client, 'facebook_notmark'), false));

        after((done) => {
            redis_client.flushdb(done);
        });
    });

    describe('redisSetPermission', () => {
        const redis_client = redis.createClient(config.get('REDIS_URL'));

        it('set success', () => {
            const set = _redis.redisSetPermission(redis_client, 'facebook_mark');
            return Promise.all([
                assert.isFulfilled(set),
                assert.becomes(set.then(() => _redis.redisGetPermission(redis_client, 'facebook_mark')), true),
            ]);
        });

        after((done) => {
            redis_client.flushdb(done);
        });
    });
});
