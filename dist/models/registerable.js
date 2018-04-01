'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (schema, opt) {
  _assertPlus2.default.func(schema.methods.t, 'translator method');
  _assertPlus2.default.func(schema.statics.t, 'translator method');

  options = opt || {};

  options.authenticationField = options.authenticationField || 'email';

  options.credentialsNotExistErrorMessage = options.credentialsNotExistErrorMessage || 'Incorrect credentials';

  options.authenticatorAlreadyExistErrorMessage = options.authenticatorAlreadyExistErrorMessage || `Account of ${options.authenticationField} already exist`;

  options.autoConfirm = options.registerable ? options.registerable.autoConfirm || false : false;

  schema.add({
    registeredAt: {
      type: Date,
      default: null
    },

    unregisteredAt: {
      type: Date,
      default: null
    }
  });

  schema.statics.register = function (credentials, opts) {
    const Registerable = this;

    return new Promise(async (resolve, reject) => {
      try {
        _assertPlus2.default.object(credentials, this.t('credentialsNotExistErrorMessage'));

        const registerable = new Registerable(credentials);

        await registerable.validate();

        if ((0, _helpers.isFunction)(registerable.generateConfirmationToken)) {
          await registerable.generateConfirmationToken();
        }

        registerable.registeredAt = new Date();

        await registerable.save();

        if ((0, _helpers.isFunction)(registerable.sendConfirmation) && !options.autoConfirm) {
          await registerable.sendConfirmation(opts);
        }

        if (options.autoConfirm && (0, _helpers.isFunction)(registerable.confirm)) {
          registerable.confirmationSentAt = new Date();
          await registerable.confirm();
        }

        resolve(registerable);
      } catch (error) {
        const regex = new RegExp(options.authenticationField, 'g');

        if (error.code === 11000 && regex.test(error.message)) {
          error.message = this.t('authenticatorAlreadyExistErrorMessage', {
            field: options.authenticationField
          });
        }
        (0, _helpers.parseError)(error);
        reject(error);
      }
    });
  };

  schema.methods.unregister = function () {
    const self = this;

    return new Promise(async (resolve, reject) => {
      try {
        self.unregisteredAt = new Date();

        await self.save();

        resolve(true);
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