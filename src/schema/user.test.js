const chai = require("chai");
const assert = chai.assert;
chai.use(require("chai-as-promised"));
const { UserInputError } = require("apollo-server-express");
const { connectMongo } = require("../models/connect");
const {
    generateInterviewExperienceData,
    generateWorkExperienceData,
} = require("../routes/experiences/testData");
const { FakeUserFactory } = require("../utils/test_helper");
const resolvers = require("../schema/resolvers");

const userExperiencesResolver = resolvers.User.experiences;
const userExperiencesCountResolver = resolvers.User.experience_count;

describe("User 經驗相關", () => {
    let db;
    const fake_user_factory = new FakeUserFactory();
    const fake_user = {
        facebook_id: "-1",
    };
    const fake_other_user = {
        facebook_id: "-2",
    };
    let work_experience_id;
    let interview_experience_id;

    before(async () => {
        ({ db } = await connectMongo());
        await fake_user_factory.setUp();
    });

    before("Create some users", async () => {
        await fake_user_factory.create(fake_user);
    });

    before("Create data", async () => {
        const user_work_experience = {
            ...generateWorkExperienceData(),
            status: "published",
            author_id: fake_user._id,
        };
        const user_interview_experience = {
            ...generateInterviewExperienceData(),
            status: "hidden",
            author_id: fake_user._id,
        };
        const other_user_interview_experience = {
            ...generateInterviewExperienceData(),
            status: "published",
            author_id: fake_other_user._id,
        };
        const result = await db
            .collection("experiences")
            .insertMany([
                user_work_experience,
                user_interview_experience,
                other_user_interview_experience,
            ]);
        work_experience_id = result.insertedIds[0];
        interview_experience_id = result.insertedIds[1];
    });

    after(async () => {
        await db.collection("experiences").deleteMany({});
        await fake_user_factory.tearDown();
    });

    describe("User@experiences resolver", () => {
        it("Resolve user's experiences", async () => {
            const results = await userExperiencesResolver(
                fake_user,
                { start: 0, limit: 20 },
                { db }
            );
            assert.lengthOf(results, 2);
            assert.sameMembers(results.map(x => x._id.toString()), [
                work_experience_id.toString(),
                interview_experience_id.toString(),
            ]);
        });

        it("Reject, if limit > 100", async () => {
            const resultsP = userExperiencesResolver(
                fake_user,
                { start: 0, limit: 150 },
                { db }
            );
            assert.isRejected(resultsP, UserInputError);
        });

        it("Reject, if start < 0", async () => {
            const resultsP = userExperiencesResolver(
                fake_user,
                { start: -5, limit: 20 },
                { db }
            );
            assert.isRejected(resultsP, UserInputError);
        });
    });

    describe("User@experiences_count resolver", () => {
        it("Resolve user's experiences", async () => {
            const results = await userExperiencesCountResolver(
                fake_user,
                {},
                { db }
            );
            assert.equal(results, 2);
        });
    });
});
