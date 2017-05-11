module.exports = function(...args) {
    return new Validator(...args);
};

class BaseValidator {
    constructor(value, optional=false, message) {
        this.value = value;
        this.isRequired = (optional === false);
        this.isNotUndefined = (typeof this.value !== 'undefined');

        if (this.isRequired && (typeof this.value === 'undefined')) {
            throw new Error(message || `${this.value} is required`);
        }
    }

    or(func1, func2) {
        let error_count = 0;
        let err;

        try {
            func1(this);
        } catch (e) {
            error_count += 1;
            err = e;
        }

        try {
            func2(this);
        } catch (e) {
            error_count += 1;
            err = e;
        }

        if (error_count === 2) {
            throw err;
        }

        return this;
    }

    in(range, message) {
        if (this.isNotUndefined && range.indexOf(this.value) === -1) {
            throw new Error(message || `${this.value} should in ${range}`);
        }
        return this;
    }
}

class Validator extends BaseValidator {
    number(message) {
        if (this.isNotUndefined && (typeof this.value !== 'number')) {
            throw new Error(message || `${this.value} should be a number`);
        }

        return new NumberValidator(this.value, !this.isRequired);
    }

    string(message) {
        if (this.isNotUndefined && (typeof this.value !== 'string')) {
            throw new Error(message || `${this.value} should be a string`);
        }

        return new StringValidator(this.value, !this.isRequired);
    }
}

class NumberValidator extends BaseValidator {
    be(operator, value, message) {
        if (this.isNotUndefined && !this._be(operator, value)) {
            throw new Error(message || `${this.value} should ${operator} ${value}`);
        }
        return this;
    }

    _be(operator, value) {
        if (operator === '>=') {
            return this.value >= value;
        }
        if (operator === '>') {
            return this.value > value;
        }
        if (operator === '<=') {
            return this.value <= value;
        }
        if (operator === '<') {
            return this.value >= value;
        }
        throw new Error('operator is not support');
    }
}

class StringValidator extends BaseValidator {
    length(min, max, message) {
        if (this.isNotUndefined) {
            if (min && this.value.length < min) {
                throw new Error(message || `string should have length >= ${min}`);
            }
            if (max && this.value.length > max) {
                throw new Error(message || `string should have length <= ${max}`);
            }
        }
        return this;
    }
}

module.exports.Validator = Validator;
module.exports.NumberValidator = NumberValidator;
module.exports.StringValidator = StringValidator;
