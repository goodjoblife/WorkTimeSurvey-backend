const { assert } = require('chai');
const app = require('../../../app');
const {
    MongoClient,
    ObjectId,
} = require('mongodb');
const config = require('config');
const request = require('supertest');
const sinon = require('sinon');
const authentication = require('../../../libs/authentication');

describe('GET /me/replies', () => {
    let db;
    let sandbox;
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

    before(async () => {
        db = await MongoClient.connect(config.get('MONGODB_URI'));
    });

    before('Mock User', () => {
        sandbox = sinon.sandbox.create();
        const cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication');
        cachedFacebookAuthentication
            .withArgs(sinon.match.object, sinon.match.object, 'fakeaccesstoken')
            .resolves(fake_user);
        cachedFacebookAuthentication
            .withArgs(sinon.match.object, sinon.match.object, 'fakeOtherAccessToken')
            .resolves(fake_other_user);
    });

    before('Seed replies', async () => {
        const experience_id = new ObjectId();
        const replies = [
            {
                content: 'first reply',
                experience_id,
                author_id: fake_user._id,
                like_count: 0,
                report_count: 0,
                created_at: new Date('2017-08-01T08:00:00.000Z'),
                floor: 1,
                status: 'hidden',
            },
            {
                content: 'second reply',
                experience_id,
                author_id: fake_user._id,
                like_count: 0,
                report_count: 0,
                created_at: new Date('2017-08-01T08:10:00.000Z'),
                floor: 3,
                status: 'published',
            },
            {
                content: 'other reply',
                experience_id,
                author_id: new ObjectId(),
                like_count: 0,
                report_count: 0,
                created_at: new Date('2017-08-01T08:10:00.000Z'),
                floor: 3,
                status: 'hidden',
            },
        ];
        await db.collection('replies').insertMany(replies);
    });

    it('should get his/her replies',
        async () => {
            const res = await request(app).get(`/me/replies`)
                .query({
                    access_token: 'fakeaccesstoken',
                })
                .expect(200);

            // ensure the format is correct
            assert.propertyVal(res.body, 'total', 2);
            assert.property(res.body, 'replies');
            assert.lengthOf(res.body.replies, 2);
            assert.deepProperty(res.body, 'replies.0._id');
            assert.deepProperty(res.body, 'replies.0.content');
            assert.deepProperty(res.body, 'replies.0.like_count');
            assert.deepProperty(res.body, 'replies.0.report_count');
            assert.deepProperty(res.body, 'replies.0.created_at');
            assert.deepProperty(res.body, 'replies.0.floor');
            assert.deepProperty(res.body, 'replies.0.status');
            assert.notDeepProperty(res.body, 'replies.0.author_id');

            // ensure the order is reverse of created_at
            assert.deepPropertyVal(res.body, 'replies.0.content', 'second reply');
            assert.deepPropertyVal(res.body, 'replies.1.content', 'first reply');
        }
    );

    it('should get no replies when user does not have replies',
        async () => {
            const res = await request(app).get(`/me/replies`)
                .query({
                    access_token: 'fakeOtherAccessToken',
                })
                .expect(200);

            assert.propertyVal(res.body, 'total', 0);
            assert.property(res.body, 'replies');
            assert.lengthOf(res.body.replies, 0);
        }
    );

    it('should return 422, when limit > 100',
        () =>
            request(app).get(`/me/replies`)
                .query({
                    access_token: 'fakeaccesstoken',
                    limit: '101',
                })
                .expect(422)
    );

    it('should retun 422, when start < 0',
        () =>
            request(app).get(`/me/replies`)
                .query({
                    access_token: 'fakeaccesstoken',
                    start: '-5',
                })
                .expect(422)
    );

    it('should return 401, if not authenticated',
        () =>
            request(app).get(`/me/replies`)
                .expect(401)
    );

    after(() => {
        sandbox.restore();
    });

    after(() => db.collection('replies').deleteMany({}));
});
