const assert = require('chai').assert;
const request = require('supertest');
const app = require('../app');
const MongoClient = require('mongodb').MongoClient;
const config = require('config');

describe('jobs', () => {
    let db;

    before(() => MongoClient.connect(config.get('MONGODB_URI')).then((_db) => {
        db = _db;
    }));

    describe('search', () => {
        before(() => db.collection('job_titles').insertMany([
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
        ]));

        it('will return array with _id, des', () => request(app)
                .get('/jobs/search')
                .query({ key: 'g' })
                .expect(200)
                .expect((res) => {
                    assert.isArray(res.body);
                    assert.deepProperty(res.body, '0._id');
                }));

        it('will return jobs with keyword `g`', () => request(app)
                .get('/jobs/search')
                .query({ key: 'g' })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body, 1);
                }));

        it('will return all jobs if missing keyword', () => request(app)
                .get('/jobs/search')
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body, 2);
                }));

        after(() => db.collection('job_titles').deleteMany({}));
    });
});
