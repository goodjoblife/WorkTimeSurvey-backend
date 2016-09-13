const assert = require('chai').assert;
const request = require('supertest');
const app = require('../app');
const MongoClient = require('mongodb').MongoClient;

describe('jobs', function() {
    var db = undefined;

    before(function() {
        return MongoClient.connect(process.env.MONGODB_URI).then(function(_db) {
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

        it('will return array with _id, des', function(done) {
            request(app)
                .get('/jobs/search')
                .query({key: 'g'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.deepProperty(res.body, '0._id');
                })
                .end(done);
        });

        it('will return jobs with keyword `g`', function(done) {
            request(app)
                .get('/jobs/search')
                .query({key: 'g'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                })
                .end(done);
        });

        it('will return all jobs if missing keyword', function(done) {
            request(app)
                .get('/jobs/search')
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 2);
                })
                .end(done);
        });

        after(function() {
            return db.collection('job_titles').remove({});
        });
    });
});

