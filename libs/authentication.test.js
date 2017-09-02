const chai = require('chai');
chai.use(require("chai-as-promised"));

const assert = chai.assert;
const sinon = require('sinon');
const config = require('config');
const MongoClient = require('mongodb').MongoClient;

const authentication = require('./authentication');
const facebook = require('./facebook');
const _redis = require('./redis');

const cachedFacebookAuthentication = authentication.cachedFacebookAuthentication;

describe('Authentication Library', () => {
    describe('cachedFacebookAuthentication', () => {
        let sandbox;
        let db;
        let user;

        before('connect MongoDB', () => MongoClient.connect(config.get('MONGODB_URI')).then((_db) => {
            db = _db;
        }));

        before('Seed users', () => db.collection('users').insertOne({
            facebook_id: '1',
            facebook: {
                id: '1',
                name: 'helloworld',
            },
        })
            .then(result => db.collection('users').findOne({ _id: result.insertedId }))
            .then((_user) => {
                user = _user;
            }));

        beforeEach(() => {
            sandbox = sinon.sandbox.create();
        });

        it('resolve if cached', () => {
            const redis_client = {};
            const response = { id: '1', name: 'helloworld' };

            const redisGetFB = sandbox.stub(_redis, 'redisGetFB')
                .withArgs(redis_client, 'fake_accesstoken')
                .resolves(response);

            const main = cachedFacebookAuthentication(db, redis_client, 'fake_accesstoken');
            return Promise.all([
                assert.becomes(main, user),
                main.then(() => {
                    sinon.assert.calledOnce(redisGetFB);
                }),
            ]);
        });

        it('resolve if not cached but access_token is valid', () => {
            const redis_client = {};
            const response = { id: '1', name: 'helloworld' };

            const redisGetFB = sandbox.stub(_redis, 'redisGetFB')
                .withArgs(redis_client, 'fake_accesstoken')
                .resolves(null);

            const accessTokenAuth = sandbox.stub(facebook, 'accessTokenAuth')
                .resolves(response);

            const redisSetFB = sandbox.stub(_redis, 'redisSetFB')
                .resolves();

            const main = cachedFacebookAuthentication(db, redis_client, 'fake_accesstoken');
            return Promise.all([
                assert.becomes(main, user),
                main.then(() => {
                    sinon.assert.calledOnce(redisGetFB);
                    sinon.assert.calledOnce(accessTokenAuth);
                    sinon.assert.calledOnce(redisSetFB);
                }),
            ]);
        });

        it('resolve if cache error but access_token is valid', () => {
            const redis_client = {};
            const response = { id: '1', name: 'helloworld' };

            const redisGetFB = sandbox.stub(_redis, 'redisGetFB')
                .withArgs(redis_client, 'fake_accesstoken')
                .rejects();

            const accessTokenAuth = sandbox.stub(facebook, 'accessTokenAuth')
                .resolves(response);

            const redisSetFB = sandbox.stub(_redis, 'redisSetFB')
                .resolves();

            const main = cachedFacebookAuthentication(db, redis_client, 'fake_accesstoken');
            return Promise.all([
                assert.becomes(main, user),
                main.then(() => {
                    sinon.assert.calledOnce(redisGetFB);
                    sinon.assert.calledOnce(accessTokenAuth);
                    sinon.assert.calledOnce(redisSetFB);
                }),
            ]);
        });

        it('reject if not cached and access_token is not valid', () => {
            const redis_client = {};

            const redisGetFB = sandbox.stub(_redis, 'redisGetFB')
                .withArgs(redis_client, 'fake_accesstoken')
                .resolves(null);

            const accessTokenAuth = sandbox.stub(facebook, 'accessTokenAuth')
                .rejects();

            const redisSetFB = sandbox.stub(_redis, 'redisSetFB')
                .resolves();

            const main = cachedFacebookAuthentication(db, redis_client, 'fake_accesstoken');
            return Promise.all([
                assert.isRejected(main),
                main.catch(() => {
                    sinon.assert.calledOnce(redisGetFB);
                    sinon.assert.calledOnce(accessTokenAuth);
                    sinon.assert.callCount(redisSetFB, 0);
                }),
            ]);
        });

        it('resolve a new user if access_token presents a new user', () => {
            const redis_client = {};
            const fake_fb_account = { id: '2', name: 'Mark Chen' };

            const redisGetFB = sandbox.stub(_redis, 'redisGetFB')
                .withArgs(redis_client, 'fake_accesstoken')
                .resolves(null);

            const accessTokenAuth = sandbox.stub(facebook, 'accessTokenAuth')
                .resolves(fake_fb_account);

            const redisSetFB = sandbox.stub(_redis, 'redisSetFB')
                .resolves();

            const main = cachedFacebookAuthentication(db, redis_client, 'fake_accesstoken');
            return Promise.all([
                main.then((_user) => {
                    assert.propertyVal(_user, 'facebook_id', '2');
                    assert.deepPropertyVal(_user, 'facebook.id', '2');
                    assert.deepPropertyVal(_user, 'facebook.name', 'Mark Chen');
                }),
                main.then(() => {
                    sinon.assert.calledOnce(redisGetFB);
                    sinon.assert.calledOnce(accessTokenAuth);
                    sinon.assert.calledOnce(redisSetFB);
                }),
                main.then(() =>
                    // a new user not null in DB
                     db.collection('users').findOne({ facebook_id: '2' })
                        .then((_user) => {
                            assert.propertyVal(_user, 'facebook_id', '2');
                            assert.deepPropertyVal(_user, 'facebook.id', '2');
                            assert.deepPropertyVal(_user, 'facebook.name', 'Mark Chen');
                        })),
            ]);
        });

        afterEach(() => {
            sandbox.restore();
        });

        after(() => db.collection('users').deleteMany({}));
    });
});
