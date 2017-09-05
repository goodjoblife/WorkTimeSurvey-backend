const assert = require('chai').assert;
const request = require('supertest');
const { MongoClient, ObjectId } = require('mongodb');
const sinon = require('sinon');
const config = require('config');
const app = require('../../app');
const authentication = require('../../libs/authentication');
const { generateReplyData } = require('../experiences/testData');

describe('POST /replies/:id/likes', () => {
    let db;
    const fake_user = {
        _id: new ObjectId(),
        facebook_id: '1',
        facebook: { id: '1', name: 'markLin' },
    };
    const fake_other_user = {
        _id: new ObjectId(),
        facebook_id: '2',
        facebook: { id: '2', name: 'Mark Chen' },
    };
    let reply_id_string;
    let hidden_reply_id_string;
    const experience_id = new ObjectId();
    let sandbox;

    before('DB: Setup', () => MongoClient.connect(config.get('MONGODB_URI')).then((_db) => {
        db = _db;
    }));

    beforeEach('Seed reply', async () => {
        const published_reply = Object.assign(generateReplyData(), {
            experience_id,
            like_count: 0,
            status: 'published',
        });

        const hidden_reply = Object.assign(generateReplyData(), {
            experience_id,
            like_count: 0,
            status: 'hidden',
        });

        const insert_result = await db.collection('replies').insertMany([
            published_reply,
            hidden_reply,
        ]);

        reply_id_string = insert_result.insertedIds[0].toString();
        hidden_reply_id_string = insert_result.insertedIds[1].toString();
    });

    beforeEach('Mock', () => {
        sandbox = sinon.sandbox.create();
        const cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication');
        cachedFacebookAuthentication
            .withArgs(sinon.match.object, sinon.match.object, 'fakeAccessToken')
            .resolves(fake_user);
        cachedFacebookAuthentication
            .withArgs(sinon.match.object, sinon.match.object, 'otherFakeAccessToken')
            .resolves(fake_other_user);
    });

    it('it should 404 Not Found if reply not exists', () => request(app)
            .post(`/replies/1234567890aa/likes`)
            .send({
                access_token: 'fakeAccessToken',
            })
            .expect(404));

    it('it should 200 success if succeed', () => {
        const req = request(app)
            .post(`/replies/${reply_id_string}/likes`)
            .send({
                access_token: 'fakeAccessToken',
            })
            .expect(200)
            .expect((res) => {
                assert.deepEqual(res.body, { success: true });
            });

        const check_reply_likes_collection = req
            .then(() => db.collection('reply_likes').findOne({
                reply_id: new ObjectId(reply_id_string),
                user_id: fake_user._id,
            }))
            .then((record) => {
                assert.isNotNull(record, 'expect record is retrieved in db');
                assert.deepEqual(record.reply_id, new ObjectId(reply_id_string));
                assert.deepEqual(record.experience_id, experience_id);
            });

        const check_replies_collection = req
            .then(() => db.collection('replies').findOne({
                _id: new ObjectId(reply_id_string),
            }))
            .then((reply) => {
                assert.isNotNull(reply, 'expect reply is retrieved in db');
                assert.propertyVal(reply, 'like_count', 1);
            });

        return Promise.all([
            check_reply_likes_collection,
            check_replies_collection,
        ]);
    });


    it('it should 200 success if other user like the same reply', () => {
        const req = request(app)
            .post(`/replies/${reply_id_string}/likes`)
            .send({
                access_token: 'fakeAccessToken',
            })
            .expect(200)
            .then(() => request(app)
                .post(`/replies/${reply_id_string}/likes`)
                .send({
                    access_token: 'otherFakeAccessToken',
                })
                .expect(200)
            );

        const check = req
            .then(() => db.collection('replies').findOne({
                _id: new ObjectId(reply_id_string),
            }))
            .then((reply) => {
                assert.isNotNull(reply, 'expect reply is retrieved in db');
                assert.propertyVal(reply, 'like_count', 2);
            });

        return check;
    });

    it('it should 403 Forbidden if like again', () => {
        const req = request(app)
            .post(`/replies/${reply_id_string}/likes`)
            .send({
                access_token: 'fakeAccessToken',
            })
            .expect(200)
            .expect((res) => {
                assert.deepEqual(res.body, { success: true });
            });

        const other_req = req.then(() =>
            request(app)
                .post(`/replies/${reply_id_string}/likes`)
                .send({
                    access_token: 'fakeAccessToken',
                })
                .expect(403));

        const check_replies_collection = other_req
            .then(() => db.collection('replies').findOne({
                _id: new ObjectId(reply_id_string),
            }))
            .then((reply) => {
                assert.isNotNull(reply, 'expect reply is retrieved in db');
                assert.propertyVal(reply, 'like_count', 1, 'like_count is still 1');
            });

        return check_replies_collection;
    });

    it('it should 404 if like the hidden reply', () => request(app)
            .post(`/replies/${hidden_reply_id_string}/likes`)
            .send({
                access_token: 'fakeAccessToken',
            })
            .expect(404));

    afterEach(() => {
        sandbox.restore();
    });

    afterEach(() => db.collection('replies').deleteMany({}));

    afterEach(() => db.collection('reply_likes').deleteMany({}));
});

describe('DELETE /replies/:id/likes', () => {
    let db;
    const fake_user = {
        _id: new ObjectId(),
        facebook_id: '1',
        facebook: { id: '1', name: 'markLin' },
    };
    const fake_other_user = {
        _id: new ObjectId(),
        facebook_id: '2',
        facebook: { id: '2', name: 'Mark Chen' },
    };
    const fake_third_user = {
        _id: new ObjectId(),
        facebook_id: '3',
        facebook: { id: '3', name: 'GoodJob' },
    };
    let reply_id_string;
    let hidden_reply_id_string;
    const experience_id = new ObjectId();
    let sandbox;

    before('DB: Setup', () => MongoClient.connect(config.get('MONGODB_URI')).then((_db) => {
        db = _db;
    }));

    // 插入二個留言（作者 3 號），其中公開的留言有兩個按讚（作者 1, 2 號）
    beforeEach('Seed replies', async () => {
        const insert_result = await db.collection('replies').insertMany([
            Object.assign(generateReplyData(), {
                experience_id,
                author_id: fake_third_user._id,
                like_count: 2,
                status: 'published',
            }),
            Object.assign(generateReplyData(), {
                experience_id,
                author_id: fake_third_user._id,
                like_count: 2,
                status: 'hidden',
            }),
        ]);

        reply_id_string = insert_result.insertedIds[0].toString();
        hidden_reply_id_string = insert_result.insertedIds[1].toString();
    });

    beforeEach('Seed reply_likes', () => {
        const reply_likes = [{
            experience_id,
            reply_id: new ObjectId(reply_id_string),
            user_id: fake_user._id,
        }, {
            experience_id,
            reply_id: new ObjectId(reply_id_string),
            user_id: fake_other_user._id,
        }];

        return db.collection('reply_likes').insertMany(reply_likes);
    });

    beforeEach('Mock', () => {
        sandbox = sinon.sandbox.create();
        const cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication');
        cachedFacebookAuthentication
            .withArgs(sinon.match.object, sinon.match.object, 'fakeAccessToken')
            .resolves(fake_user);
        cachedFacebookAuthentication
            .withArgs(sinon.match.object, sinon.match.object, 'otherFakeAccessToken')
            .resolves(fake_other_user);
        cachedFacebookAuthentication
            .withArgs(sinon.match.object, sinon.match.object, 'thirdFakeAccessToken')
            .resolves(fake_third_user);
    });

    it('it should 404 Not Found if reply not exists', () => request(app)
            .delete(`/replies/1234567890aa/likes`)
            .send({
                access_token: 'fakeAccessToken',
            })
            .expect(404));

    it('it should 200 success if succeed', () => {
        const req = request(app)
            .delete(`/replies/${reply_id_string}/likes`)
            .send({
                access_token: 'fakeAccessToken',
            })
            .expect(200)
            .expect((res) => {
                assert.deepEqual(res.body, { success: true });
            });

        const check_reply_likes_collection = req
            .then(() => db.collection('reply_likes').findOne({
                reply_id: new ObjectId(reply_id_string),
                user_id: fake_user._id,
            }))
            .then((record) => {
                assert.isNull(record, 'expect nothing is trieved in db');
            });

        const check_replies_collection = req
            .then(() => db.collection('replies').findOne({
                _id: new ObjectId(reply_id_string),
            }))
            .then((reply) => {
                assert.isNotNull(reply, 'expect reply is retrieved in db');
                assert.propertyVal(reply, 'like_count', 1, 'should change from 2 to 1');
            });

        return Promise.all([
            check_reply_likes_collection,
            check_replies_collection,
        ]);
    });


    it('it should 200 success if other user dislike the same reply', () => {
        const req = request(app)
            .delete(`/replies/${reply_id_string}/likes`)
            .send({
                access_token: 'fakeAccessToken',
            })
            .expect(200)
            .then(() => request(app)
                .delete(`/replies/${reply_id_string}/likes`)
                .send({
                    access_token: 'otherFakeAccessToken',
                })
                .expect(200)
            );

        const check_like_count = req
            .then(() => db.collection('replies').findOne({
                _id: new ObjectId(reply_id_string),
            }))
            .then((reply) => {
                assert.isNotNull(reply, 'expect reply is retrieved in db');
                assert.propertyVal(reply, 'like_count', 0, 'should change from 2 to 1 then 0');
            });

        return check_like_count;
    });

    it('it should 404 NotFound if dislike a no like reply', () => request(app)
            .delete(`/replies/${reply_id_string}/likes`)
            .send({
                access_token: 'thirdFakeAccessToken',
            })
            .expect(404));

    it('it should 404 if dislike the hidden reply', () => request(app)
            .delete(`/replies/${hidden_reply_id_string}/likes`)
            .send({
                access_token: 'fakeAccessToken',
            })
            .expect(404));

    afterEach(() => {
        sandbox.restore();
    });

    afterEach(() => db.collection('replies').deleteMany({}));

    afterEach(() => db.collection('reply_likes').deleteMany({}));
});
