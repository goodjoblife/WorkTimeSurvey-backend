const assert = require('chai').assert;
const request = require('supertest');
const app = require('../../../app');
const MongoClient = require('mongodb').MongoClient;
const sinon = require('sinon');
require('sinon-as-promised');

const authentication = require('../../../libs/authentication');

describe('Experience Likes Test', function() {

    let db = undefined;
    before(function() {
        return MongoClient.connect(process.env.MONGODB_URI).then(function(_db) {
            db = _db;
        });
    });


    describe('Post : /experiences/:id/likes', function() {
        let experience_id = undefined;
        let sandbox;

        before('Create test data', function() {

            db.collection('likes').createIndex({usesr: 1, ref: 1 }, {unique: true});
            sandbox = sinon.sandbox.create();
            sandbox.stub(authentication, 'cachedFacebookAuthentication')
                .withArgs(sinon.match.object, 'fakeaccesstoken')
                .resolves({
                    id: '-1',
                    name: 'markLin',
                });
            return db.collection('experiences').insert({
                type: 'interview',
                author: {
                    type: "facebook",
                    _id: "123",
                },
                status: "published",
            }).then(function(result) {
                experience_id = result.ops[0]._id.toString();
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
                    assert.deepProperty(res.body, 'success');
                    assert.deepProperty(res.body, 'id');
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
                    .then((response) => {
                        return request(app)
                        .post('/experiences/' + experience_id + '/likes')
                        .send({
                            access_token: 'fakeaccesstoken',
                        })
                        .expect(403);
                    });
        });

        after(function() {
            let pro1 = db.collection('likes').drop();
            let pro2 = db.collection('experiences').remove({});
            return Promise.all([pro1, pro2]);
        });
        after(function() {
            sandbox.restore();
        });

    });
});
