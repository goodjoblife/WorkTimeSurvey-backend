const chai = require('chai');
chai.use(require("chai-as-promised"));

const assert = chai.assert;
const sinon = require('sinon');
require('sinon-as-promised');
const { ObjectId } = require('mongodb');

const HttpError = require('../libs/errors').HttpError;
const middlewares = require('../middlewares');
const authentication = require('../middlewares/authentication');

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

describe('Authentication Middleware', () => {
    describe('cachedFacebookAuthenticationMiddleware', () => {
        let sandbox;
        const authenticationLib = require('../libs/authentication');

        beforeEach(() => {
            sandbox = sinon.sandbox.create();
        });

        it('get property user if success ( body token )', (done) => {
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

            authentication.cachedFacebookAuthenticationMiddleware(req, {}, (err) => {
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

        it('get property user if success ( header authorization token )', (done) => {
            const bearer_token = "Bearer mF_9.B5f-4.1JqM";
            const access_token = "mF_9.B5f-4.1JqM";
            const req = {
                headers: {
                    authorization: bearer_token,
                },
                redis_client: {},
                db: {},
            };

            const fake_user = {
                _id: new ObjectId(),
                facebook_id: '-1',
            };

            const stub = sandbox.stub(authenticationLib, 'cachedFacebookAuthentication')
                .withArgs(sinon.match.object, sinon.match.object, access_token)
                .resolves(fake_user);

            authentication.cachedFacebookAuthenticationMiddleware(req, {}, (err) => {
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

        it('forbidden if fail', (done) => {
            const req = {
                redis_client: {},
                body: {
                    access_token: "random",
                },
            };
            const stub = sandbox.stub(authenticationLib, 'cachedFacebookAuthentication').rejects();

            authentication.cachedFacebookAuthenticationMiddleware(req, {}, (err) => {
                try {
                    assert.instanceOf(err, HttpError);
                    sinon.assert.calledOnce(stub);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('forbidden if access_token is not string', (done) => {
            const req = {
                redis_client: {},
                body: {
                    access_token: 0,
                },
            };
            const stub = sandbox.stub(authenticationLib, 'cachedFacebookAuthentication');

            authentication.cachedFacebookAuthenticationMiddleware(req, {}, (err) => {
                try {
                    assert.instanceOf(err, HttpError);
                    sinon.assert.notCalled(stub);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        afterEach(() => {
            sandbox.restore();
        });
    });
});
