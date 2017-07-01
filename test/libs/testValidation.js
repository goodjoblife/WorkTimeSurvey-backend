const chai = require('chai');

const assert = chai.assert;
const validation = require('../../libs/validation');

describe('Validation Library', () => {
    describe('#requiredString()', () => {
        it('should return true if string provided', () => {
            assert.isTrue(validation.requiredString('test'));
        });

        it('should return false if not string provided', () => {
            assert.isFalse(validation.requiredString(1));
        });

        it('should return false if undefined', () => {
            assert.isFalse(validation.requiredString());
        });
    });

    describe('#requiredNonEmptyString()', () => {
        it('should return true if non empty string provided', () => {
            assert.isTrue(validation.requiredNonEmptyString('test'));
        });

        it('should return false if empty string', () => {
            assert.isFalse(validation.requiredNonEmptyString(''));
        });

        it('should return false if not string proviede', () => {
            assert.isFalse(validation.requiredNonEmptyString(1));
        });
    });

    describe('#stringRequireLength()', () => {
        it('should return true if string length is appropriate', () => {
            assert.isTrue(validation.stringRequireLength('test', 1, 5));
        });

        it('should return false if string too short', () => {
            assert.isFalse(validation.stringRequireLength('test', 5));
        });

        it('should return false if string too long', () => {
            assert.isFalse(validation.stringRequireLength('test', undefined, 3));
        });
    });

    describe('#requiredNumber()', () => {
        it('should return true if number provided', () => {
            assert.isTrue(validation.requiredNumber(1));
        });

        it('should return false if not number provided', () => {
            assert.isFalse(validation.requiredNumber('test'));
        });
    });

    describe('#optionalString()', () => {
        it('should return true if string provided', () => {
            assert.isTrue(validation.optionalString('test'));
        });

        it('should return false if not string provided', () => {
            assert.isFalse(validation.optionalString(1));
        });

        it('should return true if undefined', () => {
            assert.isTrue(validation.optionalString());
        });
    });

    describe('#requiredNumberInRange(field,max,min)', () => {
        it('should return true if max=10, min=0, field=5 ', () => {
            assert.isTrue(validation.requiredNumberInRange(5, 10, 0));
        });

        it('should return true if max=10, min=0, field=0', () => {
            assert.isTrue(validation.requiredNumberInRange(0, 10, 0));
        });

        it('should return true if max=10, min=0, field=10 ', () => {
            assert.isTrue(validation.requiredNumberInRange(10, 10, 0));
        });

        it('should return false if max=10, min=0, field=11 ', () => {
            assert.isFalse(validation.requiredNumberInRange(11, 10, 0));
        });

        it('should return false if max=10, min=0, field=NaN ', () => {
            assert.isFalse(validation.requiredNumberInRange(NaN, 10, 0));
        });
    });

    describe('#requiredNumberGreaterThanOrEqualTo(field,min)', () => {
        it('should return true if min=0, field=5 ', () => {
            assert.isTrue(validation.requiredNumberGreaterThanOrEqualTo(5, 0));
        });

        it('should return true if  min=0, field=0 ', () => {
            assert.isTrue(validation.requiredNumberGreaterThanOrEqualTo(0, 0));
        });

        it('should return false if min=5 field=0', () => {
            assert.isFalse(validation.requiredNumberGreaterThanOrEqualTo(0, 5));
        });

        it('should return false if min=0 field=-1', () => {
            assert.isFalse(validation.requiredNumberGreaterThanOrEqualTo(-1, 0));
        });

        it('should return false if min=0 field=NaN', () => {
            assert.isFalse(validation.requiredNumberGreaterThanOrEqualTo(NaN, 0));
        });
    });

    describe('#optionalNumber()', () => {
        it('should return true if number provided', () => {
            assert.isTrue(validation.optionalNumber(1));
        });

        it('should return false if not number provided', () => {
            assert.isFalse(validation.optionalNumber('test'));
        });

        it('should return true if undefined', () => {
            assert.isTrue(validation.optionalNumber());
        });
    });

    describe('#shouldIn()', () => {
        it('should return true if object in the range', () => {
            assert.isTrue(validation.shouldIn(1, [1, 2, 3]));
        });

        it('should return false if object not in the range', () => {
            assert.isFalse(validation.shouldIn(1, ['1']));
        });

        it('field can be undefined', () => {
            assert.isTrue(validation.shouldIn(undefined, [undefined]));
        });
    });
});
