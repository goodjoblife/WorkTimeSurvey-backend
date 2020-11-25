const { assert } = require("chai");
const { ObjectId } = require("mongodb");
const { connectMongo } = require("../../models/connect");
const {
    FakeUserFactory,
    FakeInterviewExperienceFactory,
    FakeSalaryWorkTimeFactory,
} = require("../../utils/test_helper");
const { UserPointEvent } = require("../../models/schemas/userPointEvent");
const { oldUserContribute } = require("../../libs/events/tasks/EventType");
const { CollectionNames } = require("../../models/schemas/constants");
const migration = require("./migration-2020-11-25-user-initial-point");

// FIXME
const POINTS_PER_SALARY_WORK_TIME = 500;
const POINTS_PER_EXPERIENCE = 1000;

describe.only("Update user.points for all users and insert userPointEvents for users who contributed data", function() {
    let db;
    const fakeUserFactory = new FakeUserFactory();
    const fakeInterviewExperienceFactory = new FakeInterviewExperienceFactory();
    const fakeSalaryWorkTimeFactory = new FakeSalaryWorkTimeFactory();
    let noDataUserId = ObjectId();
    let sharedSalaryUserId = ObjectId();
    let sharedExperienceUserId = ObjectId();
    let sharedBothDataUserId = ObjectId();

    before(async () => {
        ({ db } = await connectMongo());
        await fakeUserFactory.setUp();
        await fakeInterviewExperienceFactory.setUp();
        await fakeSalaryWorkTimeFactory.setUp();
    });

    beforeEach(async () => {
        // generate fake data
        const userIds = [
            noDataUserId,
            sharedSalaryUserId,
            sharedExperienceUserId,
            sharedBothDataUserId,
        ];
        for (let userId of userIds) {
            await fakeUserFactory.create({ _id: userId });
        }
        await fakeInterviewExperienceFactory.createWithDefault({
            author_id: sharedExperienceUserId,
        });
        await fakeSalaryWorkTimeFactory.createWithDefault({
            user_id: sharedSalaryUserId,
        });

        await fakeInterviewExperienceFactory.createWithDefault({
            author_id: sharedBothDataUserId,
        });
        await fakeSalaryWorkTimeFactory.createWithDefault({
            user_id: sharedBothDataUserId,
        });
    });

    it("should update user.points correctly", async () => {
        await migration(db);
        let user = await db.collection("users").findOne({
            _id: noDataUserId,
        });
        assert.propertyVal(user, "points", 0);

        user = await db.collection("users").findOne({
            _id: sharedSalaryUserId,
        });
        assert.propertyVal(user, "points", POINTS_PER_SALARY_WORK_TIME);

        user = await db.collection("users").findOne({
            _id: sharedExperienceUserId,
        });
        assert.propertyVal(user, "points", POINTS_PER_EXPERIENCE);

        user = await db.collection("users").findOne({
            _id: sharedBothDataUserId,
        });
        assert.propertyVal(
            user,
            "points",
            POINTS_PER_EXPERIENCE + POINTS_PER_SALARY_WORK_TIME
        );
    });

    it("should insert userPointEvents correctly", async () => {
        await migration(db);
        let userPointEvents = await UserPointEvent.find({
            user_id: noDataUserId,
        });
        assert.lengthOf(userPointEvents, 0);

        userPointEvents = await UserPointEvent.find({
            user_id: sharedExperienceUserId,
        });
        assert.lengthOf(userPointEvents, 1);
        assert.deepPropertyVal(
            userPointEvents,
            "0.points",
            POINTS_PER_EXPERIENCE
        );
        assert.deepPropertyVal(
            userPointEvents,
            "0.event_name",
            oldUserContribute
        );
        assert.deepPropertyVal(
            userPointEvents,
            "0.snapshot.experience_count",
            1
        );
        assert.deepPropertyVal(
            userPointEvents,
            "0.snapshot.salary_work_time_count",
            0
        );

        userPointEvents = await UserPointEvent.find({
            user_id: sharedSalaryUserId,
        });
        assert.lengthOf(userPointEvents, 1);
        assert.deepPropertyVal(
            userPointEvents,
            "0.points",
            POINTS_PER_SALARY_WORK_TIME
        );
        assert.deepPropertyVal(
            userPointEvents,
            "0.event_name",
            oldUserContribute
        );
        assert.deepPropertyVal(
            userPointEvents,
            "0.snapshot.experience_count",
            0
        );
        assert.deepPropertyVal(
            userPointEvents,
            "0.snapshot.salary_work_time_count",
            1
        );

        userPointEvents = await UserPointEvent.find({
            user_id: sharedBothDataUserId,
        });
        assert.lengthOf(userPointEvents, 1);
        assert.deepPropertyVal(
            userPointEvents,
            "0.points",
            POINTS_PER_EXPERIENCE + POINTS_PER_SALARY_WORK_TIME
        );
        assert.deepPropertyVal(
            userPointEvents,
            "0.event_name",
            oldUserContribute
        );
        assert.deepPropertyVal(
            userPointEvents,
            "0.snapshot.experience_count",
            1
        );
        assert.deepPropertyVal(
            userPointEvents,
            "0.snapshot.salary_work_time_count",
            1
        );
    });

    afterEach(async () => {
        await db.collection(CollectionNames.User).deleteMany({});
        await db.collection(CollectionNames.Experience).deleteMany({});
        await db.collection(CollectionNames.SalaryWorkTime).deleteMany({});
        await UserPointEvent.deleteMany({});
    });

    after(async () => {
        await fakeUserFactory.tearDown();
        await fakeInterviewExperienceFactory.tearDown();
        await fakeSalaryWorkTimeFactory.tearDown();
    });
});
