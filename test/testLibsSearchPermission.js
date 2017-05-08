const chai = require('chai');
chai.use(require("chai-as-promised"));
const assert = chai.assert;
const MongoClient = require('mongodb').MongoClient;
const config = require('config');
const permission = require('../libs/search-permission');

describe('Permission Library', function() {
    let db;

    before('Setup MongoDB', function() {
        return MongoClient.connect(config.get('MONGODB_URI')).then(function(_db) {
            db = _db;
        });
    });

    const test_data = [{expected: false}];
    [1, 0, undefined].forEach(function(time_and_salary_count) {
        [1, 0, undefined].forEach(function(reference_count) {
            test_data.push({
                counts: {
                    time_and_salary_count,
                    reference_count,
                },
                expected: (time_and_salary_count || 0) + (reference_count || 0) > 0,
            });
        });
    });

    test_data.forEach(function(data) {
        describe(`correctly authorize user with ${JSON.stringify(data)}`, function() {
            before(function() {
                // insert test data into db
                if (data.counts) {
                    return db.collection('users').insert({
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

            it('search permission for user', function() {
                const user = {
                    id: 'peter.shih',
                    type: 'facebook',
                };

                return assert.becomes(permission.resolveSearchPermission(db, user), data.expected);
            });

            after(function() {
                return db.collection('users').remove({});
            });

            after(function() {
                return db.collection('recommendations').remove({});
            });
        });
    });
});
