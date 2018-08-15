module.exports = async db => {
    const collection = await db.collection("workings");

    await collection.updateMany(
        {},
        {
            $set: {
                is_archive: false,
                archive_reason: "",
            },
        }
    );
};
