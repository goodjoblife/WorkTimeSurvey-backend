const chai = require('chai');
chai.use(require("chai-as-promised"));

const assert = chai.assert;
const { MongoClient, ObjectId } = require('mongodb');
const redis = require('redis');
const HttpError = require('../libs/errors').HttpError;
const authorization = require('../middlewares/authorization');
const config = require('config');

describe('Authorization middleware', () => {
    let db;
    let redis_client;

    before('Setup MongoDB', () => MongoClient.connect(config.get('MONGODB_URI')).then((_db) => {
        db = _db;
    }));

    before('Setup Redis', () => {
        redis_client = redis.createClient({ url: config.get('REDIS_URL') });
    });

    // generate test data for count combinations
    const test_data = [{ counts: null, expected: false }];
    [1, 0, undefined].forEach((time_and_salary_count) => {
        [1, 0, undefined].forEach((reference_count) => {
            test_data.push({
                counts: {
                    time_and_salary_count,
                    reference_count,
                },
                expected: (time_and_salary_count || 0) + (reference_count || 0) > 0,
            });
        });
    });

    test_data.forEach((data) => {
        describe(`correctly authorize user with ${JSON.stringify(data)}`, () => {
            const user_id = new ObjectId();
            before(() => {
                // insert test data into db
                if (data.counts) {
                    return db.collection('users').insert({
                        _id: user_id,
                        facebook_id: 'peter.shih',
                        time_and_salary_count: data.counts.time_and_salary_count,
                    }).then(() => db.collection('recommendations').insert({
                        user: {
                            id: 'peter.shih',
                            type: 'facebook',
                        },
                        count: data.counts.reference_count,
                    }));
                }
            });

            it('search permission for user', (done) => {
                // build the fake request
                const req = {
                    user: {
                        _id: user_id,
                        facebook_id: 'peter.shih',
                    },
                    db,
                    redis_client,
                };

                // I expect next is called, so I can check here
                authorization.cachedSearchPermissionAuthorizationMiddleware(req, {}, (err) => {
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

            after(() => db.collection('users').deleteMany({}));

            after(() => db.collection('recommendations').deleteMany({}));

            after((done) => {
                redis_client.flushall(done);
            });
        });
    });

    describe('redis cached', () => {
        const user_ids = [new ObjectId(), new ObjectId()];

        before((done) => {
            redis_client.set('permission_facebook_peter.shih', '1', done);
        });

        before(() => db.collection('users').insertMany([
            {
                _id: user_ids[0],
                facebook_id: 'mark86092',
                time_and_salary_count: 1,
            },
            {
                _id: user_ids[1],
                facebook_id: 'test',
                time_and_salary_count: 0,
            },
        ]));

        it('success if redis cached', (done) => {
            const req = {
                user: {
                    _id: new ObjectId(),
                    facebook_id: 'peter.shih',
                },
                db,
                redis_client,
            };

            authorization.cachedSearchPermissionAuthorizationMiddleware(req, {}, (err) => {
                try {
                    assert.isUndefined(err);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('lookup mongo success if redis is not cached', (done) => {
            const req = {
                user: {
                    _id: user_ids[0],
                    facebook_id: 'mark86092',
                    time_and_salary_count: 1,
                },
                db,
                redis_client,
            };

            authorization.cachedSearchPermissionAuthorizationMiddleware(req, {}, (err) => {
                try {
                    assert.isUndefined(err);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('fail if lookup mongo fail and redis is not cached', (done) => {
            const req = {
                user: {
                    _id: user_ids[1],
                    facebook_id: 'test',
                    time_and_salary_count: 0,
                },
                db,
                redis_client,
            };

            authorization.cachedSearchPermissionAuthorizationMiddleware(req, {}, (err) => {
                try {
                    assert.instanceOf(err, HttpError);
                    assert.equal(err.status, 403);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        after((done) => {
            redis_client.flushall(done);
        });

        after(() => db.collection('users').deleteMany({}));
    });
});
