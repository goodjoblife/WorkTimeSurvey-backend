const winston = require("winston");

const { ensureToObjectId } = require("../../models");

async function put_time_and_salary(req, res, next) {
    const { working } = req.custom;
    const working_id = ensureToObjectId(req.params.id);

    const collection = req.db.collection("workings");
    const time_and_salary_history = req.db.collection(
        "time_and_salary_history"
    );

    try {
        const old_working = await collection.findOne({ _id: working_id });
        const now = new Date();
        old_working.ref_id = working_id;
        old_working.updated_at = now;
        delete old_working._id;

        working.updated_at = now;

        await collection.findOneAndUpdate(
            { _id: working_id },
            { $set: working }
        );
        await time_and_salary_history.insertOne(old_working);

        winston.info("update user data success", {
            id: working._id,
            ip: req.ip,
            ips: req.ips,
        });

        res.send({ success: true });
    } catch (err) {
        winston.info("update user data fail", {
            id: working._id,
            ip: req.ip,
            ips: req.ips,
            err,
        });

        throw err;
    }
}

module.exports = put_time_and_salary;
