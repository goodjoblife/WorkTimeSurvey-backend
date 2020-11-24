const { AuthenticationError } = require("apollo-server-express");

const isAuthenticated = (root, args, context) => {
    if (!context.user) {
        throw new AuthenticationError("User should provide token / login");
    }
};

// 判定 authenticated 得到的 user (conext.user) 是否跟母階層 (root) 物件所代表的 user 相同
// 用於 isAuthenticated 之後，且 root 為 Type User 才有意義
const isMe = (root, args, context) => {
    if (root && context.user) {
        if (`${root._id}` !== `${context.user._id}`) {
            throw new AuthenticationError("權限不足");
        }
    }
};

module.exports = {
    isAuthenticated,
    isMe,
};
