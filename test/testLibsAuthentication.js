const chai = require('chai');
chai.use(require("chai-as-promised"));
const assert = chai.assert;
const sinon = require('sinon');
require('sinon-as-promised');

const authentication = require('../libs/authentication');
const facebook = require('../libs/facebook');
const _redis = require('../libs/redis');

const cachedFacebookAuthentication = authentication.cachedFacebookAuthentication;

describe('Authentication Library', function() {
    describe('cachedFacebookAuthentication', function() {
        let sandbox;

        beforeEach(function() {
            sandbox = sinon.sandbox.create();
        });

        it('resolve if cached', function() {
            const db = {};
            const response = {id: '1', name: 'helloworld'};

            const redisGetFB = sandbox.stub(_redis, 'redisGetFB')
                .withArgs(db, 'fake_accesstoken')
                .resolves(response);

            const main = cachedFacebookAuthentication(db, 'fake_accesstoken');
            return Promise.all([
                assert.becomes(main, response),
                main.then(() => {
                    sinon.assert.calledOnce(redisGetFB);
                }),
            ]);
        });

        it('resolve if not cached but access_token is valid', function() {
            const db = {};
            const response = {id: '1', name: 'helloworld'};

            const redisGetFB = sandbox.stub(_redis, 'redisGetFB')
                .withArgs(db, 'fake_accesstoken')
                .resolves(null);

            const accessTokenAuth = sandbox.stub(facebook, 'accessTokenAuth')
                .resolves(response);

            const redisSetFB = sandbox.stub(_redis, 'redisSetFB')
                .resolves();

            const main = cachedFacebookAuthentication(db, 'fake_accesstoken');
            return Promise.all([
                assert.becomes(main, response),
                main.then(() => {
                    sinon.assert.calledOnce(redisGetFB);
                    sinon.assert.calledOnce(accessTokenAuth);
                    sinon.assert.calledOnce(redisSetFB);
                }),
            ]);
        });

        it('resolve if cache error but access_token is valid', function() {
            const db = {};
            const response = {id: '1', name: 'helloworld'};

            const redisGetFB = sandbox.stub(_redis, 'redisGetFB')
                .withArgs(db, 'fake_accesstoken')
                .rejects();

            const accessTokenAuth = sandbox.stub(facebook, 'accessTokenAuth')
                .resolves(response);

            const redisSetFB = sandbox.stub(_redis, 'redisSetFB')
                .resolves();

            const main = cachedFacebookAuthentication(db, 'fake_accesstoken');
            return Promise.all([
                assert.becomes(main, response),
                main.then(() => {
                    sinon.assert.calledOnce(redisGetFB);
                    sinon.assert.calledOnce(accessTokenAuth);
                    sinon.assert.calledOnce(redisSetFB);
                }),
            ]);
        });

        it('reject if not cached and access_token is not valid', function() {
            const db = {};

            const redisGetFB = sandbox.stub(_redis, 'redisGetFB')
                .withArgs(db, 'fake_accesstoken')
                .resolves(null);

            const accessTokenAuth = sandbox.stub(facebook, 'accessTokenAuth')
                .rejects();

            const redisSetFB = sandbox.stub(_redis, 'redisSetFB')
                .resolves();

            const main = cachedFacebookAuthentication(db, 'fake_accesstoken');
            return Promise.all([
                assert.isRejected(main),
                main.catch(() => {
                    sinon.assert.calledOnce(redisGetFB);
                    sinon.assert.calledOnce(accessTokenAuth);
                    sinon.assert.callCount(redisSetFB, 0);
                }),
            ]);
        });

        afterEach(function() {
            sandbox.restore();
        });
    });
});
