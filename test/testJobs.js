const assert = require('chai').assert;
const request = require('supertest');
const app = require('../app');
const MongoClient = require('mongodb').MongoClient;
const config = require('config');

describe('jobs', function() {
    var db = undefined;

    before(function() {
        return MongoClient.connect(config.get('MONGODB_URI')).then(function(_db) {
            db = _db;
        });
    });

    describe('search', function() {
        before(function() {
            return db.collection('job_titles').insertMany([
                {
                    des: 'GOOGL',
                    isFinal: true,
                },
                {
                    des: 'GOGOR',
                    isFinal: false,
                },
                {
                    des: 'YAHO',
                    isFinal: true,
                },
            ]);
        });

        it('will return array with _id, des', function() {
            return request(app)
                .get('/jobs/search')
                .query({key: 'g'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.deepProperty(res.body, '0._id');
                });
        });

        it('will return jobs with keyword `g`', function() {
            return request(app)
                .get('/jobs/search')
                .query({key: 'g'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                });
        });

        it('will return all jobs if missing keyword', function() {
            return request(app)
                .get('/jobs/search')
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 2);
                });
        });

        after(function() {
            return db.collection('job_titles').remove({});
        });
    });
});
