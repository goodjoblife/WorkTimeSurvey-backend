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
    generateInterviewExperienceData,
    generateWorkExperienceData,
} = require('../../experiences/testData');

describe('Experiences of Author Test', () => {
    let db;
    let sandbox;
    let user_interview_experience_id;
    let user_work_experience_id;
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

    before('Create Data', () => {
        const user_work_experience = Object.assign(generateWorkExperienceData(), {
            status: 'published',
            author_id: fake_user._id,
        });

        const user_interview_experience = Object.assign(generateInterviewExperienceData(), {
            status: 'published',
            author_id: fake_user._id,
        });

        const other_user_interview_experiencep = Object.assign(generateInterviewExperienceData(), {
            status: 'published',
            author_id: fake_other_user._id,
        });

        return db.collection('experiences').insertMany([
            user_work_experience,
            user_interview_experience,
            other_user_interview_experiencep,
        ]).then((result) => {
            user_work_experience_id = result.insertedIds[0];
            user_interview_experience_id = result.insertedIds[1];
        });
    });

    it('should be success, when the author get him experiences',
        async () => {
            const res = await request(app).get(`/me/experiences`)
                .query({
                    access_token: 'fakeaccesstoken',
                });

            assert.equal(res.status, 200);
            const experiences = res.body.experiences;
            const work_experience = experiences.find(experience => experience.type === 'work');
            const interview_experience = experiences.find(experience => experience.type === 'interview');
            assert.equal(work_experience._id, user_work_experience_id);
            assert.equal(interview_experience._id, user_interview_experience_id);
        }
    );

    it('should get user work experiences ',
        async () => {
            const res = await request(app).get(`/me/experiences`)
                .query({
                    access_token: 'fakeaccesstoken',
                    type: 'work',
                });

            assert.equal(res.status, 200);
            const experiences = res.body.experiences;
            assert.lengthOf(experiences, 1);
            assert.equal(experiences[0]._id, user_work_experience_id);
        }
    );

    it('should get user work and interview experiences',
        async () => {
            const res = await request(app).get(`/me/experiences`)
                .query({
                    access_token: 'fakeaccesstoken',
                    type: 'work,interview',
                });

            assert.equal(res.status, 200);
            assert.lengthOf(res.body.experiences, 2);
        }
    );

    it('should be error 422, when limit > 100',
        async () => {
            const res = await request(app).get(`/me/experiences`)
                .query({
                    access_token: 'fakeaccesstoken',
                    limit: 150,
                });

            assert.equal(res.status, 422);
        }
    );

    it('should be error, when start < 0',
        async () => {
            const res = await request(app).get(`/me/experiences`)
                .query({
                    access_token: 'fakeaccesstoken',
                    start: -5,
                });

            assert.equal(res.status, 422);
        }
    );

    it('should be error, when not authenticated',
        async () => {
            const res = await request(app).get(`/me/experiences`);

            assert.equal(res.status, 401);
        }
    );

    after(() => {
        sandbox.restore();
    });

    after(() => db.collection('experiences').deleteMany({}));
});
