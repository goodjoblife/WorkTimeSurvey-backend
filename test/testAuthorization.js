describe('Authorization middleware', function() {
    const req = {};

    before(function() {
        // setup user_id
        req.user_id = 'peter.shih';
        // setup db
        return require('mongodb').MongoClient
        .connect(process.env.MONGODB_URI)
        .then(function(db) {
            req.db = db;
        })
        // setup redis
        .then(new Promise(function(resolve, reject) {
            require('../middlewares').expressRedisDb('')(req, {}, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        }));
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
                    return req.db.collection('authors').insert({
                        _id: {
                            id: 'peter.shih',
                            type: 'facebook',
                        },
                        queries_count: data.counts.queries_count,
                    }).then(() => req.db.collection('references').insert({
                        user: {
                            id: 'peter.shih',
                            type: 'facebook',
                        },
                        count: data.counts.reference_count,
                    }));
                }
            });

            it('search permission for user', function(done) {
                require('../middlewares/authorization')(req, {}, function(err) {
                    if (!err && !data.expected || err && data.expected) {
                        done('Not as expected');
                    } else {
                        done();
                    }
                });
            });

            it('checkout redis', function(done) {
                // second access to permission will checkout redis first
                req.redis_client.get('peter.shih', (err, reply) => {
                    if (err) {
                        done(err);
                    } else if (reply && data.expected) {
                        done();
                    } else if (!reply && !data.expected) {
                        done();
                    } else {
                        done('Incorrect key-value in redis');
                    }
                });
            });

            after(function() {
                return Promise.all([
                    req.db.collection('authors').remove({}),
                    req.db.collection('references').remove({}),
                    req.redis_client.flushall(),
                ]);
            });
        });
    });
});

