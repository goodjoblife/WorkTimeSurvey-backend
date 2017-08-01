const assert = require('chai').assert;
const {
    MongoClient,
    ObjectId,
} = require('mongodb');
const request = require('supertest');
const app = require('../../../app');
const config = require('config');
const create_capped_collection = require('../../../database/migrations/create-companyKeywords-collection');

describe('Company Keywords Test', function () {
    let db = null;

    before(function () {
        return MongoClient.connect(config.get('MONGODB_URI')).then(function (_db) {
            db = _db;
        });
    });


    describe('Collection company_keywords', function () {
        it('should return true, if the collection is capped', function () {
            return db.collection('company_keywords').isCapped()
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
                    search_query: query.toString(),
                    search_by: 'company',
                })
                .expect(200)
                .then(() => db.collection('company_keywords')
                        .findOne({
                            word: query,
                        }))
                .then((result) => {
                    assert.equal(result.word, query.toString());
                });
        });
    });

    after(function () {
        return db.collection('company_keywords').drop()
            .then(() => create_capped_collection(db));
    });
});
