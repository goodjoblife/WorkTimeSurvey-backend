module.exports = {
    replyToHistoryMap(reply) {
        const result = reply;
        result.ref_id = reply._id;
        result.updated_at = new Date();
        delete result._id;
        return result;
    },
};
