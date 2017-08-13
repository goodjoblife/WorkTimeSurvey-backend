const assert = require('chai').assert;
const app = require('../../../app');
const {
    MongoClient,
    ObjectId,
} = require('mongodb');
const config = require('config');
const request = require('supertest');
const sinon = require('sinon');
require('sinon-as-promised');
const authentication = require('../../../libs/authentication');
const {
    generateInterviewExperienceData,
    generateWorkExperienceData,
} = require('../testData');

describe('Experiences of Author Test', () => {
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

    before(() => MongoClient.connect(config.get('MONGODB_URI')).then((_db) => {
        db = _db;
    }));

    before('Moch User', () => {
        sandbox = sinon.sandbox.create();
        const cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication')
            .withArgs(sinon.match.object, sinon.match.object, 'fakeaccesstoken')
            .resolves(fake_user);

        cachedFacebookAuthentication
            .withArgs(sinon.match.object, sinon.match.object, 'other_fakeaccesstoken')
            .resolves(fake_other_user);
    });

    before('Create Data', () => {
        const work_data = Object.assign(generateWorkExperienceData(), {
            status: 'published',
            author_id: fake_user._id,
        });

        const interview_data = Object.assign(generateInterviewExperienceData(), {
            status: 'published',
            author_id: fake_user._id,
        });

        const interview_data_other = Object.assign(generateInterviewExperienceData(), {
            status: 'published',
            author_id: fake_other_user._id,
        });

        return db.collection('experiences').insertMany([
            work_data,
            interview_data,
            interview_data_other,
        ]);
    });

    it('should be success, when the author get him experiences',
        async () => {
            const res = await request(app).get(`/me/experiences`)
                .query({
                    access_token: 'fakeaccesstoken',
                });
            assert.equal(res.status, 200);
            assert.lengthOf(res.body.experiences, 2);
        }
    );

    after(() => {
        sandbox.restore();
    });

    after(() => db.collection('experiences').deleteMany({}));
});
