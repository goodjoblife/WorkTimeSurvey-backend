var request = require('request');

function access_token_auth_middleware(req, res, next) {
    var access_token = req.body.access_token;

    access_token_auth(access_token).then(function(facebook) {
        req.facebook = facebook;
        next();
    }).catch(function(err) {
        next(err);
    });
}

function access_token_auth(access_token) {
    return new Promise(function(resolve, reject) {
        if (! access_token) {
            throw new Error("access_token is required");
        }

        if (access_token === "") {
            throw new Error("access_token is required");
        }

        request.get({
            url: "https://graph.facebook.com/v2.6/me",
            qs: {
                access_token: access_token,
                fields: "id,name",
                format: "json",
            },
        }, function(error, response, body) {
            if (error) {
                reject(new Error("access_token is invalid"));
            }

            var content = JSON.parse(body);

            if (content.error) {
                reject(new Error("access_token is invalid"));
            }

            resolve({id: content.id, name: content.name});
        });
    });
}

module.exports = {
    access_token_auth: access_token_auth,
    access_token_auth_middleware: access_token_auth_middleware,
};
