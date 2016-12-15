const chai = require('chai');
chai.use(require("chai-as-promised"));
const assert = chai.assert;
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;

const recommendation = require('../libs/recommendation');

describe('Recommendation Library', function() {
    describe('getRecommendationString', function() {
        let db;

        before(function() {
            return MongoClient.connect(process.env.MONGODB_URI).then((_db) => {
                db = _db;
            });
        });

        before(function() {
            return db.collection('recommendations').insertMany([
                {
                    _id: new ObjectId('00000000ccd8958909a983e9'),
                    user: {
                        id: '-1',
                        type: 'facebook',
                    },
                },
            ]);
        });

        it('resolve with correct _id', function() {
            const user = {
                id: '-1',
                type: 'facebook',
            };

            return assert.becomes(recommendation.getRecommendationString(user), '00000000ccd8958909a983e9');
        });

        it('resolve with new recommendation string', function() {
            const user = {
                id: 'mark',
                type: 'facebook',
            };

            // 這裡沒檢查得到的 string 是不是屬於 user 的
            return assert.isFulfilled(recommendation.getRecommendationString(user));
        });

        after(function() {
            return db.collection('recommendations').remove({});
        });
    });

    describe('getUserByRecommendationString', function() {
        let db;

        before(function() {
            return MongoClient.connect(process.env.MONGODB_URI).then((_db) => {
                db = _db;
            });
        });

        before(function() {
            return db.collection('recommendations').insertMany([
                {
                    _id: new ObjectId('00000000ccd8958909a983e9'),
                    user: {
                        id: '-1',
                        type: 'facebook',
                    },
                },
            ]);
        });

        it('resolve with correct user', function() {
            return assert.becomes(recommendation.getUserByRecommendationString('00000000ccd8958909a983e9'), {id: '-1', type: 'facebook'});
        });

        it('resolve with null', function() {
            return assert.becomes(recommendation.getUserByRecommendationString('00000000ccd8958909a983ea'), null);
        });

        it('reject if format error', function() {
            return Promise.all([
                // should be a string
                assert.isRejected(recommendation.getUserByRecommendationString(1234)),
                // should be a single String of 12 bytes or a string of 24 hex characters
                assert.isRejected(recommendation.getUserByRecommendationString('0000')),
            ]);
        });

        after(function() {
            return db.collection('recommendations').remove({});
        });
    });
});
