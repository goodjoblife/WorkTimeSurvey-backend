const migration = require("../../database/migrations/migration-2017-08-11-update-experiences-workings-collection");
const chai = require("chai");
const { connectMongo } = require("../../models/connect");

const assert = chai.assert;

describe("Migration 2017-08-11 create-status-test", () => {
    let db;

    before(async () => {
        ({ db } = await connectMongo());
    });

    before("Create the test data", () => {
        const test_experiences = [
            {
                title: "goodjob",
            },
            {
                title: "hello mark",
            },
        ];
        const test_workings = [
            {
                title: "goodjob",
            },
            {
                title: "hello mark",
            },
        ];
        return Promise.all([
            db.collection("experiences").insertMany(test_experiences),
            db.collection("workings").insertMany(test_workings),
        ]);
    });

    it("should have the status field and value", () =>
        migration(db)
            .then(() =>
                db
                    .collection("experiences")
                    .find()
                    .toArray()
            )
            .then(experiences => {
                experiences.forEach(experience => {
                    assert.propertyVal(experience, "status", "published");
                });
                return db
                    .collection("workings")
                    .find()
                    .toArray();
            })
            .then(workings => {
                workings.forEach(working => {
                    assert.propertyVal(working, "status", "published");
                });
            }));

    after(() =>
        Promise.all([
            db.collection("experiences").deleteMany({}),
            db.collection("workings").deleteMany({}),
        ])
    );
});
