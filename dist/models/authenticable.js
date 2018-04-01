'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (schema, opt) {
  _assertPlus2.default.func(schema.methods.t, 'translator method');
  _assertPlus2.default.func(schema.statics.t, 'translator method');

  options = opt || {};

  options.authenticationField = options.authenticationField || 'email';
  options.authenticationFieldType = options.authenticationFieldType || Email;

  options.passwordField = options.passwordField || 'password';

  options.hashedPasswordField = options.hashedPasswordField || 'hash';

  options.authenticatorErrorMessage = options.authenticatorErrorMessage || `No ${options.authenticationField} provided`;

  options.passwordErrorMessage = options.passwordErrorMessage || 'No password provided';

  options.passwordNotMatchErrorMessage = options.passwordNotMatchErrorMessage || 'Incorrect password';

  options.hashedPasswordErrorMessage = options.hashedPasswordErrorMessage || 'Hashed password not found';

  options.saltErrorMessage = options.saltErrorMessage || 'Does not have salt';

  options.authenticatorNotExistErrorMessage = options.authenticatorNotExistErrorMessage || `Incorrect ${options.authenticationField}`;

  options.credentialsNotExistErrorMessage = options.credentialsNotExistErrorMessage || 'Incorrect credentials';

  options.maximumAllowedFailedAttempts = options.lockable ? options.lockable.maximumAllowedFailedAttempts || 3 : 3;

  const authenticationFields = {};

  authenticationFields[options.authenticationField] = {
    type: options.authenticationFieldType,
    lowercase: true,
    unique: true,
    trim: true,
    index: true
  };

  authenticationFields[options.hashedPasswordField] = {
    type: String
  };

  authenticationFields.salt = {
    type: String
  };

  schema.add(authenticationFields);

  schema.virtual(options.passwordField).set(function (password) {
    const scope = this;
    scope.encryptPassword(password);
  });

  schema.methods.encryptPassword = function (password) {
    const self = this;
    try {
      _assertPlus2.default.ok(password, this.t('passwordErrorMessage'));

      if (!self.salt) {
        self.salt = _bcryptjs2.default.genSaltSync(10);
      }

      self.hash = _bcryptjs2.default.hashSync(password, self.salt);
    } catch (error) {
      throw error;
    }
  };

  schema.methods.comparePassword = async function (password) {
    const self = this;
    return new Promise(async (resolve, reject) => {
      try {
        _assertPlus2.default.ok(self.hash, this.t('hashedPasswordErrorMessage'));
        _assertPlus2.default.ok(password, this.t('passwordErrorMessage'));

        const res = _bcryptjs2.default.compareSync(password, self.hash);
        _assertPlus2.default.ok(res, this.t('passwordNotMatchErrorMessage'));

        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  };

  schema.methods.changePassword = async function (newPassword) {
    const self = this;
    return new Promise(async (resolve, reject) => {
      try {
        await self.encryptPassword(newPassword);
        await self.save();

        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  };

  schema.statics.authenticate = async function (credentials, opts) {
    const Authenticable = this;
    return new Promise(async (resolve, reject) => {
      try {
        _assertPlus2.default.object(credentials, this.t('credentialsNotExistErrorMessage'));
        _assertPlus2.default.ok(credentials.password, this.t('passwordErrorMessage'));
        _assertPlus2.default.ok(credentials[options.authenticationField], this.t('authenticatorErrorMessage', {
          field: options.authenticationField
        }));

        const criteria = {};
        criteria[options.authenticationField] = credentials[options.authenticationField];

        criteria.unregisteredAt = null;

        const authenticable = await Authenticable.findOne(criteria);
        _assertPlus2.default.object(authenticable, this.t('authenticatorNotExistErrorMessage', {
          field: options.authenticationField
        }));

        await authenticable.authenticate(credentials.password, opts);

        resolve(authenticable);
      } catch (error) {
        (0, _helpers.parseError)(error);
        reject(error);
      }
    });
  };

  schema.methods.authenticate = async function (password, opts) {
    const self = this;
    return new Promise(async (resolve, reject) => {
      try {
        if ((0, _helpers.isFunction)(self.isConfirmed)) {
          await self.isConfirmed();
        }

        if ((0, _helpers.isFunction)(self.isLocked)) {
          await self.isLocked();
        }

        await self.comparePassword(password);

        if ((0, _helpers.isFunction)(self.resetFailedAttempts)) {
          await self.resetFailedAttempts();
        }

        resolve(true);
      } catch (error) {
        if (self.confirmedAt !== null) {
          self.failedAttempts = self.failedAttempts + 1;

          const failedAttemptsExceed = self.failedAttempts >= options.maximumAllowedFailedAttempts;

          if (failedAttemptsExceed) {
            await self.lock(opts);
          }

          await self.save();
        }
        reject(error);
      }
    });
  };
};

var _bcryptjs = require('bcryptjs');

var _bcryptjs2 = _interopRequireDefault(_bcryptjs);

var _assertPlus = require('assert-plus');

var _assertPlus2 = _interopRequireDefault(_assertPlus);

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _helpers = require('../helpers');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const Schema = _mongoose2.default.Schema;
const Email = Schema.Types.Email;

let options = {};