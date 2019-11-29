const get = require("lodash/get");

module.exports = async db => {
    const users = await db
        .collection("users")
        .find({
            $and: [
                { name: { $exists: false } },
                {
                    $or: [
                        { "facebook.name": { $exists: true } },
                        { "google.name": { $exists: true } },
                    ],
                },
            ],
        })
        .toArray();

    // update each user.name
    const bulk_ops = db.collection("users").initializeOrderedBulkOp();
    for (let user of users) {
        const name = get(user, "facebook.name") || get(user, "google.name");
        if (name) {
            bulk_ops.find({ _id: user._id }).update({
                $set: { name },
            });
        }
    }
    const bulk_write_result = await bulk_ops.execute();
    console.log("ok:", bulk_write_result.ok);
    console.log("nModified:", bulk_write_result.nModified);
};
