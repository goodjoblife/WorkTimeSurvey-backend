const assert = require('chai').assert;
const app = require('../../../app');
const {
    MongoClient,
    ObjectId,
} = require('mongodb');
const config = require('config');
const request = require('supertest');
const sinon = require('sinon');
const authentication = require('../../../libs/authentication');
const {
    generateWorkingData,
} = require('../../experiences/testData');

describe('Get /me/workings ', () => {
    let db;
    let sandbox;
    let user_working_id_str;
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

    before(() => MongoClient.connect(config.get('MONGODB_URI')).then((_db) => {
        db = _db;
    }));

    before('Mock User', () => {
        sandbox = sinon.sandbox.create();
        sandbox.stub(authentication, 'cachedFacebookAuthentication')
            .withArgs(sinon.match.object, sinon.match.object, 'fakeaccesstoken')
            .resolves(fake_user);
    });

    before('Create Data',
        async () => {
            const user_working = Object.assign(generateWorkingData(), {
                author: {
                    type: 'facebook',
                    id: fake_user.facebook_id,
                },
            });

            const other_user_working = Object.assign(generateWorkingData(), {
                author: {
                    type: 'facebook',
                    id: fake_other_user.facebook_id,
                },
            });

            const workings = await db.collection('workings').insertMany([
                user_working,
                other_user_working,
            ]);
            user_working_id_str = workings.insertedIds[0].toString();
        }
    );

    it('should be currect fields ',
        async () => {
            const res = await request(app).get(`/me/workings`)
                .query({
                    access_token: 'fakeaccesstoken',
                });

            assert.equal(res.status, 200);
            assert.property(res.body, 'total');
            assert.property(res.body, 'time_and_salary');
            assert.property(res.body.time_and_salary[0], '_id');
            assert.property(res.body.time_and_salary[0], 'company');
            assert.property(res.body.time_and_salary[0], 'sector');
            assert.property(res.body.time_and_salary[0], 'created_at');
            assert.property(res.body.time_and_salary[0], 'data_time');
            assert.property(res.body.time_and_salary[0], 'estimated_hourly_wage');
            assert.property(res.body.time_and_salary[0], 'job_title');
            assert.property(res.body.time_and_salary[0], 'overtime_frequency');
            assert.property(res.body.time_and_salary[0], 'salary');
            assert.property(res.body.time_and_salary[0], 'week_work_time');
            assert.property(res.body.time_and_salary[0], 'status');
        }
    );

    it('should get workings of user and total equal 1 ',
        async () => {
            const res = await request(app).get(`/me/workings`)
                .query({
                    access_token: 'fakeaccesstoken',
                });

            assert.equal(res.status, 200);
            const workings = res.body.time_and_salary;
            assert.lengthOf(workings, 1);
            assert.equal(workings[0]._id, user_working_id_str);
        }
    );

    it('should be error, when not authenticated',
        async () => {
            const res = await request(app).get(`/me/workings`);

            assert.equal(res.status, 401);
        }
    );

    after(() => {
        sandbox.restore();
    });

    after(() => db.collection('workings').deleteMany({}));
});
