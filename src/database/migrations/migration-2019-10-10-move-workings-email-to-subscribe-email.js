const { validateEmail } = require("../../libs/validation");

module.exports = async db => {
    // get all emails from salary work times
    const salary_work_times = await db
        .collection("workings")
        .find({ "author.email": { $exists: true } })
        .sort({ created_at: -1 })
        .project({ _id: 1, author: 1 })
        .toArray();

    // validate email and get the newest email for each user
    const user_emails = {};
    for (let salary_work_time of salary_work_times) {
        const user_facebook_id = salary_work_time.author.id;

        const email = salary_work_time.author.email.trim().toLowerCase();
        if (!validateEmail(email)) {
            console.log(`invalid email: |${email}| will be skipped`);
            continue;
        }
        if (!user_emails[user_facebook_id]) {
            user_emails[user_facebook_id] = email;
        }
    }

    // update each user email
    const bulk_ops = db.collection("users").initializeOrderedBulkOp();
    for (let facebook_id of Object.keys(user_emails)) {
        bulk_ops.find({ facebook_id: facebook_id }).update({
            $set: {
                email: user_emails[facebook_id],
                subscribeEmail: true,
            },
        });
    }
    const bulk_write_result = await bulk_ops.execute();
    console.log("ok:", bulk_write_result.ok);
    console.log("nModified:", bulk_write_result.nModified);
};
