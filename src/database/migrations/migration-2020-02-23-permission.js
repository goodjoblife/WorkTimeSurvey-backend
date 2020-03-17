// this variable should be change later
const HOURS_AFTER_NOW_FOR_PERMISSION = 1;
const permissionExpiresAt = new Date(
    new Date().getTime() + HOURS_AFTER_NOW_FOR_PERMISSION * 60 * 60 * 1000
);

module.exports = async db => {
    const bulkOps = db.collection("users").initializeUnorderedBulkOp();
    const userCollection = await db.collection("users");
    const experiencesCollection = await db.collection("experiences");
    const workingsCollection = await db.collection("workings");
    const ids = await userCollection
        .find()
        .map(doc => doc._id)
        .toArray();
    for (let i = 0; i < ids.length; i++) {
        const experiencesCount = await experiencesCollection.countDocuments({
            author_id: ids[i],
            status: "published",
            "archive.is_archived": false,
        });
        const workingsCount = await workingsCollection.countDocuments({
            user_id: ids[i],
            status: "published",
            "archive.is_archived": false,
        });
        if (i % 1000 === 0) {
            // eslint-disable-next-line no-console
            console.log(`Checking ${i} documents...`);
        }
        let updateTime = new Date();
        if (experiencesCount || workingsCount) {
            updateTime = permissionExpiresAt;
        }
        bulkOps
            .find({ _id: ids[i] })
            .update({ $set: { permissionExpiresAt: updateTime } });
    }
    // eslint-disable-next-line no-console
    console.log("Updating documents...");
    const bulkOpsResult = await bulkOps.execute();

    // eslint-disable-next-line no-console
    console.log("nModified:", bulkOpsResult.nModified);
};
