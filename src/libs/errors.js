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

class EmailTemplateTypeError extends Error {
    /*
     * @param  message  any
     */
}

class EmailTemplateVariablesError extends Error {
    /*
     * @param  message  any
     */
}

module.exports = {
    HttpError,
    ObjectIdError,
    DuplicateKeyError,
    ObjectNotExistError,
    EmailTemplateTypeError,
    EmailTemplateVariablesError,
};
