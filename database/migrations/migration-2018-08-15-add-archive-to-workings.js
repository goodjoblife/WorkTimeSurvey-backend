module.exports = async db => {
    const collection = await db.collection("workings");

    await collection.updateMany(
        {},
        {
            $set: {
                archive: {
                    is_archived: false,
                    reason: "",
                },
            },
        }
    );
};
