const { assert } = require('chai');
const { MongoClient } = require('mongodb');
const config = require('config');
const create_capped_collection = require('./create-jobTitleKeywords-collection');

describe('Job title Keywords Test', function () {
    let db = null;

    before(function () {
        return MongoClient.connect(config.get('MONGODB_URI')).then(function (_db) {
            db = _db;
        });
    });


    describe('Collection job_title_keywords', function () {
        it('should return true, if the collection is capped', function () {
            return db.collection('job_title_keywords').isCapped()
                    .then((result) => {
                        assert.isTrue(result);
                    });
        });
    });

    after(function () {
        return db.collection('job_title_keywords').drop()
            .then(() => create_capped_collection(db));
    });
});
