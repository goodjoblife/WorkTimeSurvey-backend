const { ObjectId } = require("mongodb");
const { _sign, _verify } = require("../libs/jwt");
const secret = process.env.VERIFY_EMAIL_JWT_SECRET;

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

async function issueToken({ user_id, email, redirect_url }) {
    const payload = {
        // to remember whom the token for
        u: user_id.toString(),
        e: email,
        r: redirect_url,
    };
    return await sign(payload);
}

async function verifyToken({ token }) {
    const payload = await verify(token);
    return {
        user_id: ObjectId(payload.u),
        email: payload.e,
        redirect_url: payload.r,
    };
}

module.exports = {
    sign,
    verify,
    issueToken,
    verifyToken,
};
