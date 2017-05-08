const assert = require('chai').assert;
const request = require('supertest');
const app = require('../../../app');
const { MongoClient, ObjectId } = require('mongodb');
const sinon = require('sinon');
require('sinon-as-promised');
const config = require('config');

const authentication = require('../../../libs/authentication');

describe('Replies Test', function() {

    let db = undefined;
    let fake_user = {
        _id: new ObjectId(),
        facebook_id: '-1',
        facebook: {
            id: '-1',
            name: 'markLin',
        },
    };

    before(function() {
        return MongoClient.connect(config.get('MONGODB_URI')).then(function(_db) {
            db = _db;
        });
    });

    describe('Post /experiences/:id/replies', function() {
        let experience_id = undefined;
        let sandbox;

        before('Create test data', function() {

            sandbox = sinon.sandbox.create();
            sandbox.stub(authentication, 'cachedFacebookAuthentication')
                .withArgs(sinon.match.object, sinon.match.object, 'fakeaccesstoken')
                .resolves(fake_user);

            return db.collection('experiences').insertOne({
                type: 'interview',
                author: {
                    type: "facebook",
                    _id: "123",
                },
                reply_count: 0,
            }).then(function(result) {
                experience_id = result.insertedId.toString();
            });
        });

        it('Success, and expected return data', function() {
            return request(app)
                .post('/experiences/' + experience_id + '/replies')
                .send({
                    access_token: 'fakeaccesstoken',
                    content: "你好我是大留言",
                })
                .expect(200)
                .expect(function(res) {
                    assert.property(res.body, 'reply');
                    assert.deepProperty(res.body, 'reply._id');
                    assert.deepPropertyVal(res.body, 'reply.content', '你好我是大留言');
                    assert.deepPropertyVal(res.body, 'reply.floor', 0);
                    assert.deepPropertyVal(res.body, 'reply.experience_id', experience_id);
                    assert.deepPropertyVal(res.body, 'reply.like_count', 0);
                    assert.deepEqual(res.body.reply.user, {id: '-1', type: 'facebook'});
                })
                .then(res => Promise.all([
                    // experience part
                    db.collection('experiences').findOne({_id: ObjectId(experience_id)})
                        .then(experience => {
                            assert.equal(experience.reply_count, 1);
                        }),
                    // reply part
                    db.collection('replies').findOne({_id: ObjectId(res.body.reply._id)})
                        .then(reply => {
                            assert.deepEqual(reply.experience_id, ObjectId(experience_id));
                            assert.deepEqual(reply.user, {id: '-1', type: 'facebook'});
                        }),
                ]));
        });

        it('Fail, and expected return experiencedId does not exit', function() {
            return request(app)
                .post('/experiences/1111/replies')
                .send({
                    access_token: 'fakeaccesstoken',
                    content: "你好我是大留言",
                })
                .expect(404);
        });
        after(function() {
            let pro1 = db.collection('replies').remove({});
            let pro2 = db.collection('experiences').remove({});
            return Promise.all([pro1, pro2]);
        });

        after(function() {
            sandbox.restore();
        });
    });

    describe('Get : /experiences/:id/replies', function() {
        let experience_id = undefined;
        const test_Replies_Count = 200;

        before('Create test data', function() {
            return db.collection('experiences').insert({
                type: 'interview',
                author: {
                    type: "facebook",
                    _id: "123",
                },
                status: "published",
            }).then(function(result) {
                experience_id = result.ops[0]._id;
                let testDatas = [];
                for (var i = 0; i < test_Replies_Count; i++) {
                    testDatas.push({
                        create_at: new Date(),
                        experience_id: experience_id,
                        author: {
                            id: "man" + i,
                        },
                        content: "hello test0",
                    });
                }
                return db.collection('replies').insertMany(testDatas);
            });
        });

        it('Get experiences replies data and expect 200 replies ', function() {
            return request(app)
                .get('/experiences/' + experience_id + '/replies')
                .expect(200)
                .expect(function(res) {
                    assert.property(res.body, 'replies');
                    assert.notDeepProperty(res.body, 'author');
                    assert.isArray(res.body.replies);
                    assert.lengthOf(res.body.replies, test_Replies_Count);
                });
        });

        it('Get experiences replies data by start 0 and limit 10 , expect 10 replies ', function() {
            return request(app)
                .get('/experiences/' + experience_id + '/replies')
                .query({
                    limit: 100,
                    start: 0,
                })
                .expect(200)
                .expect(function(res) {
                    assert.property(res.body, 'replies');
                    assert.notDeepProperty(res.body, 'author');
                    assert.isArray(res.body.replies);
                    assert.lengthOf(res.body.replies, 100);
                });
        });

        it('Set error replies and expect error code 404', function() {
            return request(app)
                .get('/experiences/1111/replies')
                .expect(404);
        });
        after(function() {
            let pro1 = db.collection('replies').remove({});
            let pro2 = db.collection('experiences').remove({});
            return Promise.all([pro1, pro2]);
        });

    });
});
