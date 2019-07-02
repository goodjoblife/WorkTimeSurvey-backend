module.exports = async db => {
    const result = await db
        .collection("experiences")
        .updateMany(
            { report_count: { $eq: null } },
            { $set: { report_count: 0 } }
        );

    console.log("ok:", result.result.ok);
    console.log("nModified:", result.result.nModified);
};
