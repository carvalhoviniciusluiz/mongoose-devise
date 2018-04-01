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

  options.invalidConfirmationTokenErrorMessage = options.invalidConfirmationTokenErrorMessage || 'Invalid confirmation token';

  options.confirmationTokenExpiredErrorMessage = options.confirmationTokenExpiredErrorMessage || 'Confirmation token expired';

  options.accountNotConfirmedErrorMessage = options.accountNotConfirmedErrorMessage || 'Account not confirmed';

  options.checkConfirmationTokenExpiredErrorMessage = options.checkConfirmationTokenExpiredErrorMessage || 'Confirmation token expired. Check your email for confirmation instructions.';

  options.tokenLifeSpan = options.confirmable ? options.confirmable.tokenLifeSpan || 3 : 3;

  schema.add({
    confirmationToken: {
      type: String,
      default: null,
      index: true
    },
    confirmationTokenExpiryAt: {
      type: Date,
      default: null
    },
    confirmedAt: {
      type: Date,
      default: null
    },
    confirmationSentAt: {
      type: Date,
      default: null
    }
  });

  schema.methods.generateConfirmationToken = function (opts = { save: true }) {
    _assertPlus2.default.object(opts, 'opts');

    const self = this;
    return new Promise(async (resolve, reject) => {
      try {
        self.confirmationTokenExpiryAt = (0, _helpers.addDays)(options.tokenLifeSpan);

        const tokenizer = (0, _helpers.genToken)(self.confirmationTokenExpiryAt.getTime().toString());

        self.confirmationToken = tokenizer.encrypt(self[options.authenticationField]);

        self.confirmedAt = null;

        if (opts.save) {
          await self.save();
        }

        resolve(self);
      } catch (error) {
        reject(error);
      }
    });
  };

  schema.methods.sendConfirmation = function (opts = { save: true }) {
    const self = this;

    const isConfirmed = self.confirmedAt && self.confirmedAt !== null;

    return new Promise(async (resolve, reject) => {
      if (isConfirmed) {
        return resolve(self);
      }

      self.send(self, 'account_confirmation', async callback => {
        try {
          if ((0, _helpers.isFunction)(callback)) {
            callback(opts);
          }

          self.confirmationSentAt = new Date();

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

  schema.methods.isConfirmed = function () {
    const self = this;

    const isConfirmed = self.confirmedAt && self.confirmedAt !== null;

    const isTokenExpired = !(0, _helpers.isAfter)(new Date(), self.confirmationTokenExpiryAt);

    return new Promise(async (resolve, reject) => {
      try {
        if (!isConfirmed && !isTokenExpired) {
          throw new Error(this.t('accountNotConfirmedErrorMessage'));
        }

        if (!isConfirmed && isTokenExpired) {
          await self.generateConfirmationToken({ save: false });
          await self.sendConfirmation();

          throw new Error(this.t('checkConfirmationTokenExpiredErrorMessage'));
        }

        resolve(isConfirmed);
      } catch (error) {
        reject(error);
      }
    });
  };

  schema.statics.confirm = function (confirmationToken) {
    const Confirmable = this;

    return new Promise(async (resolve, reject) => {
      try {
        const confirmable = await Confirmable.findOne({ confirmationToken });
        _assertPlus2.default.object(confirmable, this.t('invalidConfirmationTokenErrorMessage'));

        await confirmable.confirm();

        resolve(confirmable);
      } catch (error) {
        (0, _helpers.parseError)(error);
        reject(error);
      }
    });
  };

  schema.methods.confirm = function () {
    let self = this;

    const isTokenExpired = !(0, _helpers.isAfter)(new Date(), self.confirmationTokenExpiryAt);

    return new Promise(async (resolve, reject) => {
      try {
        if (!self.confirmationToken) {
          throw new Error(this.t('invalidConfirmationTokenErrorMessage'));
        }

        if (isTokenExpired) {
          throw new Error(this.t('confirmationTokenExpiredErrorMessage'));
        }

        const value = self.confirmationTokenExpiryAt.getTime().toString();
        const tokenizer = (0, _helpers.genToken)(value);

        const validConfirmation = tokenizer.match(self.confirmationToken, self[options.authenticationField]);
        if (!validConfirmation) {
          throw new Error(this.t('invalidConfirmationTokenErrorMessage'));
        }

        self.confirmedAt = new Date();

        await self.save();

        resolve(validConfirmation);
      } catch (error) {
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