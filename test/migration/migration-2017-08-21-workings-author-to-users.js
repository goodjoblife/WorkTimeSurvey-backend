const { assert } = require('chai');
const { MongoClient } = require('mongodb');
const config = require('config');
const migration = require('../../database/migrations/migration-2017-08-21-workings-author-to-users');

describe('migration-2017-08-21-workings-author-to-users', () => {
    let db;

    before(async () => {
        db = await MongoClient.connect(config.get('MONGODB_URI'));
    });

    before('Seed workings', () =>
        db.collection('workings').insertMany([
            {
                author: {
                    id: '001',
                    name: 'mark',
                    type: 'facebook',
                },
            },
            {
                author: {
                    id: '002',
                    name: 'jacky',
                    type: 'facebook',
                },
            },
        ]));

    before('Seed users', () =>
        db.collection('users').insertMany([
            {
                facebook_id: '001',
            },
            {
                facebook_id: '002',
                facebook: {
                    id: '002',
                    name: 'jacky',
                },
            },
        ]));

    it('should have the status field and value', async () => {
        await migration(db);

        const user_001 = await db.collection('users').findOne({ facebook_id: '001' });
        assert.deepEqual(user_001.facebook, { id: '001', name: 'mark' });
        const user_002 = await db.collection('users').findOne({ facebook_id: '002' });
        assert.deepEqual(user_002.facebook, { id: '002', name: 'jacky' });
    });

    after(() => Promise.all([
        db.collection('users').deleteMany({}),
        db.collection('workings').deleteMany({}),
    ]));
});
