const {
    calculateEstimatedMonthlyWage,
} = require("../../routes/workings/helper");

module.exports = async db => {
    const collection = await db.collection("workings");

    const workings = await collection
        .find({
            "salary.amount": { $exists: true },
            day_real_work_time: { $exists: true },
            week_work_time: { $exists: true },
        })
        .toArray();
    const workingsOps = collection.initializeOrderedBulkOp();
    for (let working of workings) {
        const estimated_monthly_wage = calculateEstimatedMonthlyWage(working);
        if (estimated_monthly_wage > 100000000) {
            continue;
        }
        workingsOps.find({ _id: working._id }).update({
            $set: {
                estimated_monthly_wage,
            },
        });
    }
    const workingOpsResult = await workingsOps.execute();
    console.log("Update ok:", workingOpsResult.ok);
    console.log("nModified:", workingOpsResult.nModified);
};
