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

  options.invalidRecoveryDetailsErrorMessage = options.invalidRecoveryDetailsErrorMessage || 'Invalid recovery details';

  options.invalidRecoveryTokenErrorMessage = options.invalidRecoveryTokenErrorMessage || 'Invalid recovery token';

  options.recoveryTokenExpiredErrorMessage = options.recoveryTokenExpiredErrorMessage || 'Recovery token expired';

  options.authenticatorErrorMessage = options.authenticatorErrorMessage || `No ${options.authenticationField} provided`;

  options.credentialsNotExistErrorMessage = options.credentialsNotExistErrorMessage || 'Incorrect credentials';

  options.tokenLifeSpan = options.recoverable ? options.recoverable.tokenLifeSpan || 3 : 3;

  schema.add({
    recoveryToken: {
      type: String,
      default: null,
      index: true
    },
    recoveryTokenExpiryAt: {
      type: Date,
      default: null
    },
    recoverySentAt: {
      type: Date,
      default: null
    },
    recoveredAt: {
      type: Date,
      default: null
    }
  });

  schema.methods.generateRecoveryToken = function (opts = { save: true }) {
    _assertPlus2.default.object(opts, 'opts');

    const self = this;
    return new Promise(async (resolve, reject) => {
      try {
        self.recoveryTokenExpiryAt = (0, _helpers.addDays)(options.tokenLifeSpan);

        const tokenizer = (0, _helpers.genToken)(self.recoveryTokenExpiryAt.getTime().toString());

        self.recoveryToken = tokenizer.encrypt(self[options.authenticationField]);

        self.recoveredAt = null;

        if (opts.save) {
          await self.save();
        }

        resolve(self);
      } catch (error) {
        reject(error);
      }
    });
  };

  schema.methods.sendRecovery = function (opt = { save: true }) {
    const self = this;

    const isRecovered = self.recoveredAt && self.recoveredAt !== null;

    return new Promise(async (resolve, reject) => {
      if (isRecovered) {
        return resolve(self);
      }

      self.send(self, 'password_recovery', async callback => {
        try {
          if ((0, _helpers.isFunction)(callback)) {
            callback(opt);
          }

          self.recoverySentAt = new Date();

          if (opt.save) {
            await self.save();
          }

          resolve(self);
        } catch (error) {
          reject(error);
        }
      });
    });
  };

  schema.statics.requestRecover = function (credentials, opts) {
    const Recoverable = this;

    !(0, _helpers.isObject)(opts) ? opts = { save: false } : opts.save = false;

    return new Promise(async (resolve, reject) => {
      try {
        _assertPlus2.default.object(credentials, this.t('credentialsNotExistErrorMessage'));
        _assertPlus2.default.ok(credentials[options.authenticationField], this.t('authenticatorErrorMessage', {
          field: options.authenticationField
        }));

        const criteria = {};
        criteria[options.authenticationField] = credentials[options.authenticationField];

        const recoverable = await Recoverable.findOne(criteria);
        _assertPlus2.default.object(recoverable, this.t('invalidRecoveryDetailsErrorMessage'));

        if ((0, _helpers.isFunction)(recoverable.isConfirmed)) {
          await recoverable.isConfirmed();
        }

        await recoverable.generateRecoveryToken(opts);
        await recoverable.sendRecovery(opts);
        await recoverable.save();

        resolve(recoverable);
      } catch (error) {
        (0, _helpers.parseError)(error);
        reject(error);
      }
    });
  };

  schema.statics.recover = function (recoveryToken, newPassword) {
    const Recoverable = this;

    return new Promise(async (resolve, reject) => {
      try {
        const recoverable = await Recoverable.findOne({ recoveryToken });
        _assertPlus2.default.object(recoverable, this.t('invalidRecoveryTokenErrorMessage'));

        const isTokenExpired = !(0, _helpers.isAfter)(new Date(), recoverable.recoveryTokenExpiryAt);

        if (isTokenExpired) {
          throw new Error(this.t('recoveryTokenExpiredErrorMessage'));
        }

        const value = recoverable.recoveryTokenExpiryAt.getTime().toString();
        const tokenizer = (0, _helpers.genToken)(value);

        if (!tokenizer.match(recoveryToken, recoverable[options.authenticationField])) {
          throw new Error(this.t('invalidRecoveryTokenErrorMessage'));
        }

        recoverable.recoveredAt = new Date();

        if ((0, _helpers.isFunction)(recoverable.encryptPassword)) {
          await recoverable.changePassword(newPassword);
        }

        resolve(recoverable);
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