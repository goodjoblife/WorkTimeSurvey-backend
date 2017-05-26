const assert = require('chai').assert;
const mongo = new require('mongodb');
const request = require('supertest');
const app = require('../../../app');
const {
    MongoClient,
    ObjectId,
} = require('mongodb');
const sinon = require('sinon');
require('sinon-as-promised');
const config = require('config');

const authentication = require('../../../libs/authentication');
const {
    generateInterviewExperienceData,
} = require('../testData');

describe('Experience Likes Test', function() {

    let db = undefined;
    const fake_user = {
        _id: new ObjectId(),
        facebook_id: '-1',
        facebook: {
            id: '-1',
            name: 'markLin',
        },
    };
    const fake_other_user = {
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
                        .find({
                            _id: new mongo.ObjectId(experience_id),
                        })
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
                        .find({
                            _id: new mongo.ObjectId(experience_id),
                        })
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
                        .find({
                            _id: new mongo.ObjectId(experience_id),
                        })
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
            let pro1 = db.collection('experience_likes').remove();
            let pro2 = db.collection('experiences').remove({});
            return Promise.all([pro1, pro2]);
        });

    });

    describe('Delete : /experiences/:id/likes', function() {
        let experience_id_string_by_user = null;
        let experience_id_by_user = null;
        let experience_id_by_other_user = null;
        let test_likes = null;
        let sandbox;

        beforeEach('mock user', function() {
            sandbox = sinon.sandbox.create();
            const cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication');

            cachedFacebookAuthentication
                .withArgs(sinon.match.object, sinon.match.object, 'fakeaccesstoken')
                .resolves(fake_user);
            cachedFacebookAuthentication
                .withArgs(sinon.match.object, sinon.match.object, 'otherFakeAccessToken')
                .resolves(fake_other_user);

        });

        beforeEach('create test data', function() {
            const experience_by_user = Object.assign(generateInterviewExperienceData(), {
                author: {
                    id: fake_user.facebook_id,
                    type: 'facebook',
                },
                like_count: 2,
            });

            const experience_by_other_user = Object.assign(generateInterviewExperienceData(), {
                author: {
                    id: fake_other_user.facebook_id,
                    type: 'facebook',
                },
            });

            return db.collection('experiences').insertMany([
                experience_by_user,
                experience_by_other_user,
            ]).then(function(result) {
                experience_id_by_user = result.ops[0]._id;
                experience_id_string_by_user = result.ops[0]._id.toString();
                experience_id_by_other_user = result.ops[1]._id;

                return db.collection('experience_likes').insertMany([{
                    created_at: new Date(),
                    user: {
                        id: fake_user.facebook_id,
                        type: 'facebook',
                    },
                    experience_id: experience_id_by_user,
                }, {
                    created_at: new Date(),
                    user: {
                        id: fake_other_user.facebook_id,
                        type: 'facebook',
                    },
                    experience_id: experience_id_by_user,

                }, {
                    created_at: new Date(),
                    user: {
                        id: fake_user.facebook_id,
                        type: 'facebook',
                    },
                    experience_id: experience_id_by_other_user,
                }]);
            }).then((likes) => {
                test_likes = likes.ops;
            });
        });

        it('should delete the record, and return success', function() {
            const req = request(app)
                .delete(`/experiences/${experience_id_string_by_user}/likes`)
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .expect(200);

            return Promise.all([
                req.then((res) => {
                    return db.collection('experience_likes').findOne({
                        experience_id: experience_id_by_user,
                        user: {
                            id: fake_user.facebook_id,
                            type: 'facebook',
                        },
                    });
                })
                .then((result) => {
                    assert.equal(result, null, 'No record in experience_likes');
                }),
                req.then((res) => {
                    return db.collection('experiences').findOne({
                        _id: experience_id_by_user,
                    });
                })
                .then((experience) => {
                    assert.equal(experience.like_count, 1, 'the like_count should be 1 instead of 2');
                }),
            ]);
        });

        it('cannot delete like, beacause the user does not login and return 404', function() {
            return db.collection('experience_likes').remove({
                user: test_likes[0].user,
            }).then((result) => {
                return request(app)
                    .delete(`/experiences/${experience_id_string_by_user}/likes`)
                    .expect(401);
            }).then((res) => {
                return db.collection('experiences').findOne({
                    _id: experience_id_by_user,
                });
            }).then((experience) => {
                assert.equal(experience.like_count, 2, 'the like_count should be 2 (it can not change)');
            });
        });

        it('cannot delete like, beacause the like does not exist and return 404', function() {
            return db.collection('experience_likes').remove({
                user: test_likes[0].user,
            }).then((result) => {
                return request(app)
                    .delete(`/experiences/${experience_id_string_by_user}/likes`)
                    .send({
                        access_token: 'fakeaccesstoken',
                    })
                    .expect(404);
            }).then((res) => {
                return db.collection('experiences').findOne({
                    _id: experience_id_by_user,
                });
            }).then((experience) => {
                assert.equal(experience.like_count, 2, 'the like_count should be 2 (it can not change)');
            });
        });

        it('cannot delete like, because experience does not exist and return 404', function() {
            return db.collection('experience_likes').remove({
                user: test_likes[0].user,
            }).then((result) => {
                return request(app)
                    .delete('/experiences/123456789/likes')
                    .send({
                        access_token: 'fakeaccesstoken',
                    })
                    .expect(404);
            }).then((res) => {
                return db.collection('experiences').findOne({
                    _id: experience_id_by_user,
                });
            }).then((experience) => {
                assert.equal(experience.like_count, 2, 'the like_count should be 2 (it can not change)');
            });
        });

        it('should not delete others`s like if user cancels the like of an experience', function() {
            const req = request(app)
                .delete(`/experiences/${experience_id_string_by_user}/likes`)
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .expect(200);

            const check_experience_likes = req
                .then(() => {
                    return db.collection('experience_likes').findOne({
                        experience_id: experience_id_by_user,
                        user: {
                            id: fake_other_user.facebook_id,
                            type: 'facebook',
                        },
                    });
                })
                .then((result) => {
                    assert.equal(result.user.id, fake_other_user.facebook_id, 'the other user of like should exist');
                });

            return Promise.all([
                check_experience_likes,
            ]);
        });

        it('should not delete the other experiences`s like, when the user cancels the like of an experience', function() {
            const req = request(app)
                .delete(`/experiences/${experience_id_string_by_user}/likes`)
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .expect(200);

            const check_experience_likes = req
                .then(() => {
                    return db.collection('experience_likes').findOne({
                        experience_id: experience_id_by_other_user,
                        user: {
                            id: fake_user.facebook_id,
                            type: 'facebook',
                        },
                    });
                })
                .then((result) => {
                    assert.equal(result.user.id, fake_user.facebook_id, 'the other experience`s like should exist');
                });

            return Promise.all([
                check_experience_likes,
            ]);
        });

        afterEach(function() {
            sandbox.restore();
            const pro1 = db.collection('experience_likes').remove();
            const pro2 = db.collection('experiences').remove({});
            return Promise.all([pro1, pro2]);
        });
    });
});
