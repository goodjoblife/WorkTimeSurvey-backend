const config = require("config");
const { _sign, _verify } = require("../libs/jwt");
const secret = config.get("VERIFY_EMAIL_JWT_SECRET");

const EXPIRES_IN = "7d";

async function sign(payload) {
    const opt = {
        algorithm: "HS256",
        expiresIn: EXPIRES_IN,
    };
    const token = await _sign(payload, secret, opt);
    return token;
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
    verify,
};
