const assert = require('chai').assert;
const mongo = new require('mongodb');
const request = require('supertest');
const app = require('../../../app');
const MongoClient = require('mongodb').MongoClient;
const sinon = require('sinon');
require('sinon-as-promised');
const config = require('config');

const authentication = require('../../../libs/authentication');

describe('Experience Likes Test', function() {

    let db = undefined;
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
            sandbox.stub(authentication, 'cachedFacebookAuthentication')
                .withArgs(sinon.match.object, 'fakeaccesstoken')
                .resolves({
                    id: '-1',
                    name: 'markLin',
                });
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

        it('Post 2 times , and expected return 403', function() {
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

        it('Post like and get experience , and expected experience like_count will 1 ', function() {
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

        it('Post like 2 times (same user) and get experience , and expected experience like_count will 1 ', function() {
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

        it('Post like 2 times(different user) and get experience , and expected experience like_count will 2 ', function() {
            const uri = '/experiences/' + experience_id + '/likes';
            return request(app).post(uri)
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .then((res) => {
                    sandbox.restore();
                    sandbox.stub(authentication, 'cachedFacebookAuthentication')
                        .withArgs(sinon.match.object, 'fakeaccesstoken')
                        .resolves({
                            id: '-2',
                            name: 'markLin002',
                        });
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
                    assert.equal(result[0].like_count, 2);
                });
        });

        afterEach(function() {
            sandbox.restore();
            let pro1 = db.collection('likes').remove();
            let pro2 = db.collection('experiences').remove({});
            return Promise.all([pro1, pro2]);
        });

    });
});
