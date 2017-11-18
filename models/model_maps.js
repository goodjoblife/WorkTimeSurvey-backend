module.exports = {
    experienceToHistoryMap(experience) {
        const result = experience;
        result.ref_id = experience._id;
        result.updated_at = new Date();
        delete result._id;
        return result;
    },
};
