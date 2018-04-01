'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (schema, opt) {
  _assertPlus2.default.func(schema.methods.send, 'send method');
  _assertPlus2.default.func(schema.methods.t, 'translator method');
  _assertPlus2.default.func(schema.statics.t, 'translator method');

  options = opt || {};

  options.authenticationField = options.authenticationField || 'email';

  options.accountLockedErrorMessage = options.accountLockedErrorMessage || 'Account locked. Check unlock instructions sent to you.';

  options.invalidUnlockTokenErrorMessage = options.invalidUnlockTokenErrorMessage || 'Invalid unlock token';

  options.unlockTokenExpiredErrorMessage = options.unlockTokenExpiredErrorMessage || 'Unlock token expired';

  options.tokenLifeSpan = options.lockable ? options.lockable.tokenLifeSpan || 3 : 3;

  schema.add({
    failedAttempts: {
      type: Number,
      default: 0,
      index: true
    },
    lockedAt: {
      type: Date,
      default: null
    },
    unlockedAt: {
      type: Date,
      default: null
    },
    unlockToken: {
      type: String,
      default: null,
      index: true
    },
    unlockTokenSentAt: {
      type: Date,
      default: null
    },
    unlockTokenExpiryAt: {
      type: Date,
      default: null
    }
  });

  schema.methods.generateUnlockToken = function (opts = { save: true }) {
    _assertPlus2.default.object(opts, 'opts');

    const self = this;
    return new Promise(async (resolve, reject) => {
      try {
        self.unlockTokenExpiryAt = (0, _helpers.addDays)(options.tokenLifeSpan);

        const tokenizer = (0, _helpers.genToken)(self.unlockTokenExpiryAt.getTime().toString());

        self.unlockToken = tokenizer.encrypt(self[options.authenticationField]);

        self.unlockedAt = null;

        if (opts.save) {
          await self.save();
        }

        resolve(self);
      } catch (error) {
        reject(error);
      }
    });
  };

  schema.methods.sendUnlock = function (opts = { save: true }) {
    const self = this;

    const isUnlocked = self.unlockedAt && self.unlockedAt !== null;

    return new Promise(async (resolve, reject) => {
      if (isUnlocked) {
        return resolve(self);
      }

      self.send(self, 'account_recovery', async callback => {
        try {
          if ((0, _helpers.isFunction)(callback)) {
            callback(opts);
          }

          self.unlockTokenSentAt = new Date();

          if (opts.save) {
            await self.save();
          }

          resolve(self);
        } catch (error) {
          reject(error);
        }
      });
    });
  };

  schema.methods.isLocked = function () {
    const self = this;

    const isLocked = self.lockedAt && self.lockedAt !== null;

    const isUnlockTokenExpired = !(0, _helpers.isAfter)(new Date(), self.unlockTokenExpiryAt);

    return new Promise(async (resolve, reject) => {
      try {
        if (!isLocked) {
          return resolve(false);
        }

        if (isLocked && isUnlockTokenExpired) {
          await self.generateUnlockToken({ save: false });
          await self.sendUnlock();
        }

        throw new Error(this.t('accountLockedErrorMessage'));
      } catch (error) {
        reject(error);
      }
    });
  };

  schema.methods.resetFailedAttempts = function () {
    const self = this;
    return new Promise(async (resolve, reject) => {
      try {
        self.failedAttempts = 0;

        await self.save();

        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  };

  schema.methods.lock = function (opts) {
    const self = this;

    !(0, _helpers.isObject)(opts) ? opts = { save: false } : opts.save = false;

    return new Promise(async (resolve, reject) => {
      try {
        self.lockedAt = new Date();

        await self.generateUnlockToken(opts);

        await self.sendUnlock(opts);
        await self.save();

        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  };

  schema.statics.unlock = function (unlockToken) {
    const Lockable = this;
    return new Promise(async (resolve, reject) => {
      try {
        const lockable = await Lockable.findOne({ unlockToken });
        _assertPlus2.default.object(lockable, this.t('invalidUnlockTokenErrorMessage'));

        const isTokenExpired = !(0, _helpers.isAfter)(new Date(), lockable.unlockTokenExpiryAt);

        if (isTokenExpired) {
          throw new Error(this.t('unlockTokenExpiredErrorMessage'));
        }

        const value = lockable.unlockTokenExpiryAt.getTime().toString();
        const tokenizer = (0, _helpers.genToken)(value);

        if (!tokenizer.match(unlockToken, lockable[options.authenticationField])) {
          throw new Error(this.t('invalidUnlockTokenErrorMessage'));
        }

        lockable.unlockedAt = new Date();

        lockable.failedAttempts = 0;

        lockable.lockedAt = null;

        await lockable.save();

        resolve(lockable);
      } catch (error) {
        (0, _helpers.parseError)(error);
        reject(error);
      }
    });
  };
};

var _assertPlus = require('assert-plus');

var _assertPlus2 = _interopRequireDefault(_assertPlus);

var _helpers = require('../helpers');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let options = {};