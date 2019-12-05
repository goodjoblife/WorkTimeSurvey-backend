module.exports = async db => {
    console.log(await db.collection("workings").count());

    const salary_work_times = await db
        .collection("workings")
        .find({
            "author.id": { $exists: true },
            "author.type": "facebook",
        })
        .toArray();

    console.log("expected nModified:", salary_work_times.length);

    // update each salary_work_time.user_id
    const bulk_ops = db.collection("workings").initializeOrderedBulkOp();
    for (let salary_work_time of salary_work_times) {
        const facebook_id = salary_work_time.author.id;

        const user = await db.collection("users").findOne({ facebook_id });

        if (user) {
            const user_id = user._id;
            bulk_ops.find({ _id: salary_work_time._id }).update({
                $set: { user_id },
            });
        }
    }
    const bulk_write_result = await bulk_ops.execute();
    console.log("ok:", bulk_write_result.ok);
    console.log("nModified:", bulk_write_result.nModified);
};
