const { _sign, _verify } = require("../libs/jwt");

const { JWT_SECRET: secret } = process.env;

async function sign(payload) {
    const opt = {
        algorithm: "HS256",
        expiresIn: "30d",
    };
    const token = await _sign(payload, secret, opt);
    return token;
}

async function signUser(user) {
    const user_id = user._id.toString();
    const payload = { user_id };
    return await sign(payload);
}

async function verify(payload) {
    const opt = {
        algorithm: "HS256",
    };
    const decoded = await _verify(payload, secret, opt);
    return decoded;
}

module.exports = {
    sign,
    signUser,
    verify,
};
