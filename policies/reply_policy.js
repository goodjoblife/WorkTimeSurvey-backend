module.exports.canUpdate = (user, reply) => {
    if (reply.author_id.equals(user._id)) {
        return true;
    }
    return false;
};
