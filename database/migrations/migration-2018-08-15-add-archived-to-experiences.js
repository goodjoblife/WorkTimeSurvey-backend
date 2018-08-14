module.exports = async db => {
    const collection = await db.collection("experiences");

    await collection.updateMany(
        {},
        {
            $set: {
                is_archived: false,
                archive_reason: "",
            },
        }
    );
};
