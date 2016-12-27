class HttpError extends Error {
    /*
     * @param  message  any
     * @param  code     int
     */
    constructor(message, code) {
        super(message);
        this.status = code;
    }
}

class ObjectIdError extends Error {
    /*
     * @param  message  any
     */
    constructor(message) {
        super(message);
    }
}

module.exports.HttpError = HttpError;
module.exports.ObjectIdError = ObjectIdError;
