const chai = require('chai');
const assert = chai.assert;
const Validate = require('../../libs/validator');
const { Validator, NumberValidator, StringValidator } = Validate;

describe('Validator Library', function() {
    describe('#()', function() {
        it('instance of Validator', function() {
            assert.instanceOf(Validate(1), Validator);
        });

        it('valid given a number', function() {
            assert.doesNotThrow(function() {
                Validate(5);
            });
        });

        it('valid given a string', function() {
            assert.doesNotThrow(function() {
                Validate('Hi');
            });
        });

        it('invalid given undefined', function() {
            assert.throws(function() {
                Validate();
            });
        });

        it('valid given null', function() {
            assert.doesNotThrow(function() {
                Validate(null);
            });
        });
    });

    describe('#(., optional=true)', function() {
        it('valid given a number', function() {
            assert.doesNotThrow(function() {
                Validate(5, true);
            });
        });

        it('valid given a string', function() {
            assert.doesNotThrow(function() {
                Validate('Hi', true);
            });
        });

        it('valid given undefined', function() {
            assert.doesNotThrow(function() {
                Validate(undefined, true);
            });
        });

        it('valid given null', function() {
            assert.doesNotThrow(function() {
                Validate(null, true);
            });
        });
    });

    describe('#number()', function() {
        it('instance of NumberValidator', function() {
            const validate = Validate(10);

            assert.instanceOf(validate.number(), NumberValidator);
        });

        it('valid given a number', function() {
            const validate = Validate(10);

            assert.doesNotThrow(function() {
                validate.number();
            });
        });

        it('invalid given a string', function() {
            const validate = Validate('hello');

            assert.throws(function() {
                validate.number();
            });
        });

        it('valid given optional', function() {
            const validate = Validate(undefined, true);

            assert.doesNotThrow(function() {
                validate.number();
            });
        });

        it('invalid given string with optional', function() {
            const validate = Validate('hello', true);

            assert.throws(function() {
                validate.number();
            });
        });
    });
});
