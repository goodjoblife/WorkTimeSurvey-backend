// reference https://stackoverflow.com/a/46181/9332375
function validateEmail(email) {
    // eslint-disable-next-line no-useless-escape
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

module.exports = async db => {
    // get all emails from salary work times
    const salary_work_times = await db
        .collection("workings")
        .find({ "author.email": { $ne: null } })
        .sort({ created_at: -1 })
        .project({ _id: 1, author: 1 })
        .toArray();

    // validate email and get the newest email for each user
    const user_emails = {};
    for (let salary_work_time of salary_work_times) {
        const userFacebookId = salary_work_time.author.id;

        const email = salary_work_time.author.email.trim().toLowerCase();
        if (!validateEmail(email)) {
            console.log(`invalid email: |${email}| will be skipped`);
            continue;
        }
        if (!user_emails[userFacebookId]) {
            user_emails[userFacebookId] = email;
        }
    }

    // update each user email
    const bulkOps = db.collection("users").initializeOrderedBulkOp();
    for (let facebookId of Object.keys(user_emails)) {
        bulkOps.find({ facebook_id: facebookId }).update({
            $set: { email: user_emails[facebookId] },
        });
    }
    const bulkWriteResult = await bulkOps.execute();
    console.log("ok:", bulkWriteResult.ok);
    console.log("nModified:", bulkWriteResult.nModified);
};
