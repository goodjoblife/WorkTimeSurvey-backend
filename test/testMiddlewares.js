const chai = require('chai');
chai.use(require("chai-as-promised"));
const assert = chai.assert;
const sinon = require('sinon');
require('sinon-as-promised');
const { ObjectId } = require('mongodb');

const HttpError = require('../libs/errors').HttpError;
const middlewares = require('../middlewares');
const authentication = require('../middlewares/authentication');

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

describe('Authentication Middleware', function() {
    describe('cachedFacebookAuthenticationMiddleware', function() {
        let sandbox;
        const authenticationLib = require('../libs/authentication');

        beforeEach(function() {
            sandbox = sinon.sandbox.create();
        });

        it('get property user if success', function(done) {
            const req = {
                redis_client: {},
                body: {
                    access_token: "random",
                },
            };

            const fake_user = {
                _id: new ObjectId(),
                facebook_id: '-1',
            };

            const stub = sandbox.stub(authenticationLib, 'cachedFacebookAuthentication').resolves(fake_user);

            authentication.cachedFacebookAuthenticationMiddleware(req, {}, function(err) {
                try {
                    assert.isUndefined(err);
                    assert.property(req, 'user');
                    assert.deepEqual(req.user, fake_user);
                    sinon.assert.calledOnce(stub);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('forbidden if fail', function(done) {
            const req = {
                redis_client: {},
                body: {
                    access_token: "random",
                },
            };
            const stub = sandbox.stub(authenticationLib, 'cachedFacebookAuthentication').rejects();

            authentication.cachedFacebookAuthenticationMiddleware(req, {}, function(err) {
                try {
                    assert.instanceOf(err, HttpError);
                    sinon.assert.calledOnce(stub);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('forbidden if access_token is not string', function(done) {
            const req = {
                redis_client: {},
                body: {
                    access_token: 0,
                },
            };
            const stub = sandbox.stub(authenticationLib, 'cachedFacebookAuthentication');

            authentication.cachedFacebookAuthenticationMiddleware(req, {}, function(err) {
                try {
                    assert.instanceOf(err, HttpError);
                    sinon.assert.notCalled(stub);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        afterEach(function() {
            sandbox.restore();
        });
    });
});
