// this variable should be change later
const HOURS_AFTER_NOW_FOR_PERMISSION = 1;
const permissionExpiresAt = new Date(
    new Date().getTime() + HOURS_AFTER_NOW_FOR_PERMISSION * 60 * 60 * 1000
);

module.exports = async db => {
    const userCollection = await db.collection("users");
    const experiencesCollection = await db.collection("experiences");
    const workingsCollection = await db.collection("workings");
    let modifiedCount = 0;
    await userCollection.find().forEach(async doc => {
        const { _id } = doc;
        const experiencesCount = await experiencesCollection.count({
            author_id: _id,
            status: "published",
            "archive.is_archived": false,
        });
        const workingsCount = await workingsCollection.count({
            user_id: _id,
            status: "published",
            "archive.is_archived": false,
        });
        if (experiencesCount || workingsCount) {
            modifiedCount++;
            await userCollection.update(
                { _id },
                { $set: { permissionExpiresAt } },
                {}
            );
        }
    });
    // eslint-disable-next-line no-console
    console.log("nModified:", modifiedCount);
};
