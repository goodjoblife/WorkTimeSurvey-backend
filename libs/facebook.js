const request = require("request");

/*
 * 根據 access_token 取得 FB 身份
 *
 * @param access_token any
 *
 * @fulfilled  {id, name}
 * @rejected   Error (reason)
 */
function accessTokenAuth(access_token) {
    return new Promise((resolve, reject) => {
        if (!access_token) {
            throw new Error("access_token is required");
        }

        if (access_token === "") {
            throw new Error("access_token is required");
        }

        request.get(
            {
                url: "https://graph.facebook.com/v2.6/me",
                qs: {
                    access_token,
                    fields: "id,name",
                    format: "json",
                },
            },
            (error, response, body) => {
                if (error) {
                    reject(new Error("access_token is invalid"));
                    return;
                }

                const content = JSON.parse(body);

                if (content.error) {
                    reject(new Error("access_token is invalid"));
                    return;
                }

                resolve({ id: content.id, name: content.name });
            }
        );
    });
}

module.exports = {
    accessTokenAuth,
};
