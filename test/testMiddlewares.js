const chai = require('chai');
chai.use(require("chai-as-promised"));
const assert = chai.assert;
const sinon = require('sinon');
require('sinon-as-promised');

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

        it('get property facebook if success', function(done) {
            const req = {
                redis_client: {},
                body: {
                    access_token: "random",
                },
            };
            const stub = sandbox.stub(authenticationLib, 'cachedFacebookAuthentication').resolves({id: "-1", name: "test"});

            authentication.cachedFacebookAuthenticationMiddleware(req, {}, function(err) {
                try {
                    assert.isUndefined(err);
                    assert.property(req, 'facebook');
                    assert.deepEqual(req.facebook, {id: "-1", name: "test"});
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
