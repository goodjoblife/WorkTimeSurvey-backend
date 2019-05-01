const { UNVERIFIED } = require("../../models/user_model");

module.exports = async db => {
    const result = await db
        .collection("users")
        .updateMany({}, { $set: { email_status: UNVERIFIED } });

    console.log("ok:", result.result.ok);
    console.log("nModified:", result.result.nModified);
};
