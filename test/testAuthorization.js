const chai = require('chai');
chai.use(require("chai-as-promised"));
const assert = chai.assert;
const MongoClient = require('mongodb').MongoClient;
const redis = require('redis');
const HttpError = require('../libs/errors').HttpError;
const authorization = require('../middlewares/authorization');

describe('Authorization middleware', function() {
    let db;
    let redis_client;

    before('Setup MongoDB', function() {
        return MongoClient.connect(process.env.MONGODB_URI).then(function(_db) {
            db = _db;
        });
    });

    before('Setup Redis', function() {
        redis_client = redis.createClient({'url': process.env.REDIS_URL});
    });

    // generate test data for count combinations
    const test_data = [{counts: null, expected: false}];
    [1, 0, undefined].forEach(function(queries_count) {
        [1, 0, undefined].forEach(function(reference_count) {
            test_data.push({
                counts: {
                    queries_count,
                    reference_count,
                },
                expected: (queries_count || 0) + (reference_count || 0) > 0,
            });
        });
    });

    test_data.forEach(function(data) {
        describe(`correctly authorize user with ${JSON.stringify(data)}`, function() {
            before(function() {
                // insert test data into db
                if (data.counts) {
                    return db.collection('authors').insert({
                        _id: {
                            id: 'peter.shih',
                            type: 'facebook',
                        },
                        queries_count: data.counts.queries_count,
                    }).then(() => db.collection('recommendations').insert({
                        user: {
                            id: 'peter.shih',
                            type: 'facebook',
                        },
                        count: data.counts.reference_count,
                    }));
                }
            });

            it('search permission for user', function(done) {
                // build the fake request
                const req = {
                    user: {
                        id: 'peter.shih',
                        type: 'facebook',
                    },
                    db: db,
                    redis_client: redis_client,
                };

                // I expect next is called, so I can check here
                authorization.cachedSearchPermissionAuthorizationMiddleware(req, {}, function(err) {
                    try {
                        if (data.expected === true) {
                            assert.isUndefined(err);
                        } else {
                            assert.instanceOf(err, HttpError);
                            assert.equal(err.status, 403);
                        }
                        done();
                    } catch (e) {
                        // assert fail
                        done(e);
                    }
                });
            });

            after(function() {
                return db.collection('authors').remove({});
            });

            after(function() {
                return db.collection('recommendations').remove({});
            });

            after(function(done) {
                redis_client.flushall(done);
            });
        });
    });

    describe('redis cached', function() {
        before(function(done) {
            redis_client.set('permission_facebook_peter.shih', '1', done);
        });

        before(function() {
            return db.collection('authors').insertMany([
                {
                    _id: {
                        id: 'mark86092',
                        type: 'facebook',
                    },
                    queries_count: 1,
                },
                {
                    _id: {
                        id: 'test',
                        type: 'facebook',
                    },
                    queries_count: 0,
                },
            ]);
        });

        it('success if redis cached', function(done) {
            const req = {
                user: {
                    id: 'peter.shih',
                    type: 'facebook',
                },
                db: db,
                redis_client: redis_client,
            };

            authorization.cachedSearchPermissionAuthorizationMiddleware(req, {}, function(err) {
                try {
                    assert.isUndefined(err);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('lookup mongo success if redis is not cached', function(done) {
            const req = {
                user: {
                    id: 'mark86092',
                    type: 'facebook',
                },
                db: db,
                redis_client: redis_client,
            };

            authorization.cachedSearchPermissionAuthorizationMiddleware(req, {}, function(err) {
                try {
                    assert.isUndefined(err);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('fail if lookup mongo fail and redis is not cached', function(done) {
            const req = {
                user: {
                    id: 'test',
                    type: 'facebook',
                },
                db: db,
                redis_client: redis_client,
            };

            authorization.cachedSearchPermissionAuthorizationMiddleware(req, {}, function(err) {
                try {
                    assert.instanceOf(err, HttpError);
                    assert.equal(err.status, 403);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        after(function(done) {
            redis_client.flushall(done);
        });

        after(function() {
            return db.collection('authors').remove({});
        });
    });
});

