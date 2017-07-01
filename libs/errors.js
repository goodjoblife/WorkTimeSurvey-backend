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
}

class DuplicateKeyError extends Error {
    /*
     * @param  message  any
     */
}

class ObjectNotExistError extends Error {
    /*
     * @param  message  any
     */
}

module.exports.HttpError = HttpError;
module.exports.ObjectIdError = ObjectIdError;
module.exports.DuplicateKeyError = DuplicateKeyError;
module.exports.ObjectNotExistError = ObjectNotExistError;
