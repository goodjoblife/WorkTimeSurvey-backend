const assert = require('chai').assert;
const {
    MongoClient,
    ObjectId,
} = require('mongodb');
const request = require('supertest');
const app = require('../../../app');
const config = require('config');
const create_capped_collection = require('../../../database/migrations/create-jobTitleKeywords-collection');

describe('Job title Keywords Test', function () {
    let db = null;

    before(function () {
        return MongoClient.connect(config.get('MONGODB_URI')).then(function (_db) {
            db = _db;
        });
    });


    describe('Collecction job_title_keywords', function () {
        it('should return true, if the collection is capped', function () {
            return db.collection('job_title_keywords').isCapped()
                    .then((result) => {
                        assert.isTrue(result);
                    });
        });
    });

    describe('Get : /experiences (key word check)', function () {
        it('should return 200', function () {
            const query = (new ObjectId()).toString();
            return request(app).get('/experiences')
                .query({
                    search_query: query,
                    search_by: 'job_title',
                })
                .expect(200)
                .then(() => db.collection('job_title_keywords')
                        .findOne({
                            word: query.toString(),
                        }))
                .then((result) => {
                    assert.equal(result.word, query.toString());
                });
        });
    });

    after(function () {
        return db.collection('job_title_keywords').drop()
            .then(() => create_capped_collection(db));
    });
});
