const chai = require('chai');
const assert = chai.assert;
const validation = require('../../libs/validation');

describe('Validation Library', function() {
    describe('#requiredString()', function() {
        it('should return true if string provided', function() {
            assert.isTrue(validation.requiredString('test'));
        });

        it('should return false if not string provided', function() {
            assert.isFalse(validation.requiredString(1));
        });

        it('should return false if undefined', function() {
            assert.isFalse(validation.requiredString());
        });
    });

    describe('#requiredNonEmptyString()', function() {
        it('should return true if non empty string provided', function() {
            assert.isTrue(validation.requiredNonEmptyString('test'));
        });

        it('should return false if empty string', function() {
            assert.isFalse(validation.requiredNonEmptyString(''));
        });

        it('should return false if not string proviede', function() {
            assert.isFalse(validation.requiredNonEmptyString(1));
        });
    });

    describe('#stringRequireLength()', function() {
        it('should return true if string length is appropriate', function() {
            assert.isTrue(validation.stringRequireLength('test', 1, 5));
        });

        it('should return false if string too short', function() {
            assert.isFalse(validation.stringRequireLength('test', 5));
        });

        it('should return false if string too long', function() {
            assert.isFalse(validation.stringRequireLength('test', undefined, 3));
        });
    });

    describe('#requiredNumber()', function() {
        it('should return true if number provided', function() {
            assert.isTrue(validation.requiredNumber(1));
        });

        it('should return false if not number provided', function() {
            assert.isFalse(validation.requiredNumber('test'));
        });
    });

    describe('#optionalString()', function() {
        it('should return true if string provided', function() {
            assert.isTrue(validation.optionalString('test'));
        });

        it('should return false if not string provided', function() {
            assert.isFalse(validation.optionalString(1));
        });

        it('should return true if undefined', function() {
            assert.isTrue(validation.optionalString());
        });
    });

    describe('#requiredNumberInRange(field,max,min)', function() {
        it('should return true if max=10, min=0, field=5 ', function() {
            assert.isTrue(validation.requiredNumberInRange(5, 10, 0));
        });

        it('should return true if max=10, min=0, field=0', function() {
            assert.isTrue(validation.requiredNumberInRange(0, 10, 0));
        });

        it('should return true if max=10, min=0, field=10 ', function() {
            assert.isTrue(validation.requiredNumberInRange(10, 10, 0));
        });

        it('should return false if max=10, min=0, field=11 ', function() {
            assert.isFalse(validation.requiredNumberInRange(11, 10, 0));
        });

        it('should return false if max=10, min=0, field=NaN ', function() {
            assert.isFalse(validation.requiredNumberInRange(NaN, 10, 0));
        });
    });

    describe('#requiredNumberGreaterThanOrEqualTo(field,min)', function() {
        it('should return true if min=0, field=5 ', function() {
            assert.isTrue(validation.requiredNumberGreaterThanOrEqualTo(5, 0));
        });

        it('should return true if  min=0, field=0 ', function() {
            assert.isTrue(validation.requiredNumberGreaterThanOrEqualTo(0, 0));
        });

        it('should return false if min=5 field=0', function() {
            assert.isFalse(validation.requiredNumberGreaterThanOrEqualTo(0, 5));
        });

        it('should return false if min=0 field=-1', function() {
            assert.isFalse(validation.requiredNumberGreaterThanOrEqualTo(-1, 0));
        });

        it('should return false if min=0 field=NaN', function() {
            assert.isFalse(validation.requiredNumberGreaterThanOrEqualTo(NaN, 0));
        });
    });

    describe('#optionalNumber()', function() {
        it('should return true if number provided', function() {
            assert.isTrue(validation.optionalNumber(1));
        });

        it('should return false if not number provided', function() {
            assert.isFalse(validation.optionalNumber('test'));
        });

        it('should return true if undefined', function() {
            assert.isTrue(validation.optionalNumber());
        });
    });

    describe('#shouldIn()', function() {
        it('should return true if object in the range', function() {
            assert.isTrue(validation.shouldIn(1, [1, 2, 3]));
        });

        it('should return false if object not in the range', function() {
            assert.isFalse(validation.shouldIn(1, ['1']));
        });

        it('field can be undefined', function() {
            assert.isTrue(validation.shouldIn(undefined, [undefined]));
        });
    });
});
