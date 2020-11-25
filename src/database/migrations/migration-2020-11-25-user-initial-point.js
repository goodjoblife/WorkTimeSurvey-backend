const { CollectionNames } = require("../../models/schemas/constants");
const UserPointEvent = require("../../models/schemas/userPointEvent");
const TaskEventTypes = require("../../libs/events/tasks/EventType");

const POINTS_PER_SALARY_WORK_TIME = 500;
const POINTS_PER_EXPERIENCE = 1000;

module.exports = async db => {
    // 找出使用者留過的薪資工時（未隱藏＆未被封存）
    const salaryWorkTimes = await db
        .collection("workings")
        .find(
            {
                status: "published",
                "archive.is_archived": false,
            },
            { user_id: 1 }
        )
        .toArray();

    // 找出使用者留過的職場經驗（未隱藏＆未被封存）
    const experiences = await db
        .collection("experiences")
        .find(
            {
                status: "published",
                "archive.is_archived": false,
            },
            { author_id: 1 }
        )
        .toArray();

    // 整理資料
    const userData = {};
    for (let s of salaryWorkTimes) {
        const userId = `${s.user_id}`;
        if (!(userId in userData)) {
            userData[userId] = {
                salaryCnt: 0,
                expCnt: 0,
            };
        }
        userData[userId].salaryCnt += 1;
    }
    for (let e of experiences) {
        const userId = `${e.author_id}`;
        if (!(userId in userData)) {
            userData[userId] = {
                salaryCnt: 0,
                expCnt: 0,
            };
        }
        userData[userId].expCnt += 1;
    }

    // 取得所有 user
    const users = await db
        .collection("users")
        .find({}, { _id: 1 })
        .toArray();

    // 給予獎勵點數 user.points
    // Note: 這裡考量效能，不直接使用 TaskEvent 的 exec
    const userBulkOps = db.collection("users").initializeOrderedBulkOp();
    const userPointEventBulkOps = db
        .collection(CollectionNames.UserPointEvent)
        .initializeOrderedBulkOp();
    for (let user of users) {
        const userId = `${user._id}`;
        if (userId in userData) {
            const { salaryCnt, expCnt } = userData[userId];
            const points =
                salaryCnt * POINTS_PER_SALARY_WORK_TIME +
                expCnt * POINTS_PER_EXPERIENCE;
            userBulkOps.find({ _id: user._id }).update({
                $set: { points: points },
            });
            userPointEventBulkOps.insert({
                user_id: user._id,
                event_name: TaskEventTypes.oldUserContribute,
                snapshot: {
                    salary_work_time_count: salaryCnt,
                    experience_count: expCnt,
                },
                status: UserPointEvent.COMPLETED,
                points,
                created_at: new Date(),
            });
        } else {
            userBulkOps.find({ _id: user._id }).update({
                $set: { points: 0 },
            });
        }
    }

    // eslint-disable-next-line no-console
    console.log("Start updating user.points:");
    const userBulkOpsResult = await userBulkOps.execute();
    // eslint-disable-next-line no-console
    console.log("Update ok:", userBulkOpsResult.ok);
    // eslint-disable-next-line no-console
    console.log("nModified:", userBulkOpsResult.nModified);

    // eslint-disable-next-line no-console
    console.log("Start inserting user point events:");
    const userPointEventBulkOpsResult = await userPointEventBulkOps.execute();
    // eslint-disable-next-line no-console
    console.log("Update ok:", userPointEventBulkOpsResult.ok);
    // eslint-disable-next-line no-console
    console.log("nInserted:", userPointEventBulkOpsResult.nInserted);
};
