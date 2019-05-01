const jwt = require("jsonwebtoken");

function _sign(payload, secret, opt) {
    return new Promise((resolve, reject) => {
        jwt.sign(payload, secret, opt, (err, token) => {
            if (err) {
                reject(err);
            } else {
                resolve(token);
            }
        });
    });
}

function _verify(payload, secret, opt) {
    return new Promise((resolve, reject) => {
        jwt.verify(payload, secret, opt, (err, decoded) => {
            if (err) {
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    });
}

module.exports = {
    _sign,
    _verify,
};
