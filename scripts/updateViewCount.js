require("dotenv").config();

const pMap = require("p-map");
const { ObjectId } = require("mongodb");

const { connectMongo } = require("../src/models/connect");
const ModelManager = require("../src/models/manager");

(async () => {
    const { db, client } = await connectMongo();
    const { ViewLogModel, SalaryWorkTimeModel } = new ModelManager(db);

    try {
        let hasFinishedAll;
        do {
            const salaryWorkTimeViewLogs = await ViewLogModel.collection
                .aggregate([
                    {
                        $match: {
                            content_type: "SALARY_WORK_TIME",
                            has_calculated_view_count: { $ne: true },
                        },
                    },
                    { $limit: 10000 },
                    {
                        $group: {
                            _id: "$content_id",
                            content_id: { $first: "$content_id" },
                            view_count: { $sum: 1 },
                        },
                    },
                ])
                .toArray();

            await pMap(
                salaryWorkTimeViewLogs,
                viewLog => {
                    return SalaryWorkTimeModel.collection.updateOne(
                        { _id: ObjectId(viewLog.content_id) },
                        { $inc: { view_count: viewLog.view_count } }
                    );
                },
                { concurrency: 10 }
            );

            const experienceViewLogs = await ViewLogModel.collection
                .aggregate([
                    {
                        $match: {
                            content_type: "EXPERIENCE",
                            has_calculated_view_count: { $ne: true },
                        },
                    },
                    { $limit: 10000 },
                    {
                        $group: {
                            _id: "$content_id",
                            content_id: { $first: "$content_id" },
                            view_count: { $sum: 1 },
                        },
                    },
                ])
                .toArray();

            await pMap(
                experienceViewLogs,
                viewLog => {
                    return db
                        .collection("experiences")
                        .updateOne(
                            { _id: ObjectId(viewLog.content_id) },
                            { $inc: { view_count: viewLog.view_count } }
                        );
                },
                { concurrency: 10 }
            );

            await ViewLogModel.collection.updateMany(
                { content_type: { $in: ["SALARY_WORK_TIME", "EXPERIENCE"] } },
                {
                    $set: {
                        has_calculated_view_count: true,
                    },
                }
            );

            if (
                salaryWorkTimeViewLogs.length > 0 ||
                experienceViewLogs.length > 0
            ) {
                hasFinishedAll = false;
            } else {
                hasFinishedAll = true;
            }
        } while (!hasFinishedAll);
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
})();
