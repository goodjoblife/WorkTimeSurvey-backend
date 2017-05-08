const assert = require('chai').assert;
const mongo = new require('mongodb');
const request = require('supertest');
const app = require('../../../app');
const { MongoClient, ObjectId } = require('mongodb');
const sinon = require('sinon');
require('sinon-as-promised');
const config = require('config');

const authentication = require('../../../libs/authentication');

describe('Experience Likes Test', function() {

    let db = undefined;
    let fake_user = {
        _id: new ObjectId(),
        facebook_id: '-1',
        facebook: {
            id: '-1',
            name: 'markLin',
        },
    };
    let fake_other_user = {
        _id: new ObjectId(),
        facebook_id: '-2',
        facebook: {
            id: '-2',
            name: 'markLin002',
        },
    };

    before(function() {
        return MongoClient.connect(config.get('MONGODB_URI')).then(function(_db) {
            db = _db;
        });
    });


    describe('Post : /experiences/:id/likes', function() {
        let experience_id = undefined;
        let sandbox;

        beforeEach('Create test data', function() {

            sandbox = sinon.sandbox.create();
            const cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication')
                .withArgs(sinon.match.object, sinon.match.object, 'fakeaccesstoken')
                .resolves(fake_user);

            cachedFacebookAuthentication
                .withArgs(sinon.match.object, sinon.match.object, 'other_fakeaccesstoken')
                .resolves(fake_other_user);

            return db.collection('experiences').insertOne({
                type: 'interview',
                author: {
                    type: "facebook",
                    _id: "123",
                },
                status: "published",
                like_count: 0,
            }).then(function(result) {
                experience_id = result.insertedId.toString();
            });
        });

        it('Post likes, and expected return success ', function() {
            return request(app)
                .post('/experiences/' + experience_id + '/likes')
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .expect(200)
                .expect(function(res) {
                    assert.deepPropertyVal(res.body, 'success', true);
                });
        });

        it('Set error experience Id, and expected return 404', function() {
            return request(app)
                .post('/experiences/1111/likes')
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .expect(404);
        });

        it('(! Need Index), Post like 2 times , and expected return 403', function() {
            return request(app).post('/experiences/' + experience_id + '/likes')
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .then((response) => {
                    return request(app)
                        .post('/experiences/' + experience_id + '/likes')
                        .send({
                            access_token: 'fakeaccesstoken',
                        })
                        .expect(403);
                });
        });

        it('User does not login , and expected return code 401', function() {
            return request(app)
                    .post('/experiences/' + experience_id + '/likes')
                    .expect(401);
        });

        it('Post like and get experience , and expected like_count of experience should be 1 ', function() {
            return request(app).post('/experiences/' + experience_id + '/likes')
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .then((res) => {
                    return db.collection("experiences")
                    .find({ _id: new mongo.ObjectId(experience_id)})
                    .toArray()
                    .then((result) => {
                        assert.equal(result[0].like_count, 1);
                    });
                });
        });

        it('(! Need Index), Post like 2 times (same user) and get experience , and like_count of experience should be 1 ', function() {
            const uri = '/experiences/' + experience_id + '/likes';
            return request(app).post(uri)
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .then((res) => {
                    return request(app).post(uri)
                    .send({
                        access_token: 'fakeaccesstoken',
                    });
                })
                .then((res) => {
                    return db.collection("experiences")
                        .find({ _id: new mongo.ObjectId(experience_id)})
                        .toArray();
                })
                .then((result) => {
                    assert.equal(result[0].like_count, 1);
                });
        });

        it('Post like 2 times(different user) and get experience , and expected like_count of experience should be 2 ', function() {
            const uri = '/experiences/' + experience_id + '/likes';
            return request(app).post(uri)
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .then((res) => {
                    return request(app).post(uri)
                    .send({
                        access_token: 'other_fakeaccesstoken',
                    });
                })
                .then((res) => {
                    return db.collection("experiences")
                        .find({ _id: new mongo.ObjectId(experience_id)})
                        .toArray();
                })
                .then((result) => {
                    assert.equal(result[0].like_count, 2);
                });
        });

        it('Test experience_likes index  , expected the index is exist ', function() {
            return db.collection("experience_likes").indexes().then((indexes) => {
                const uniqueIndex = indexes[1];
                assert.isDefined(uniqueIndex);
                assert.equal(uniqueIndex.name, "user_1_experience_id_1");
                assert.equal(uniqueIndex.unique, true);
            });
        });

        afterEach(function() {
            sandbox.restore();
            let pro1 = db.collection('likes').remove();
            let pro2 = db.collection('experiences').remove({});
            let pro3 = db.collection('experience_likes').remove({});
            return Promise.all([pro1, pro2, pro3]);
        });

    });
});
