const chai = require('chai');
chai.use(require("chai-as-promised"));
const assert = chai.assert;
const MongoClient = require('mongodb').MongoClient;
const redis = require('redis');
const HttpError = require('../libs/errors').HttpError;
const authorizationMiddleware = require('../middlewares/authorization');

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
                    }).then(() => db.collection('references').insert({
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
                    user_id: 'peter.shih',
                    db: db,
                    redis_client: redis_client,
                };

                // I expect next is called, so I can check here
                authorizationMiddleware(req, {}, function(err) {
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
                db.collection('authors').remove({});
            });

            after(function() {
                db.collection('references').remove({});
            });

            after(function(done) {
                redis_client.flushall(done);
            });
        });
    });
});

