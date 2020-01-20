module.exports = async db => {
    const result = await db
        .collection("experiences")
        .updateMany(
            { report_count: { $eq: null } },
            { $set: { report_count: 0 } }
        );

    // eslint-disable-next-line no-console
    console.log("ok:", result.result.ok);
    // eslint-disable-next-line no-console
    console.log("nModified:", result.result.nModified);
};
