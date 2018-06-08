'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (schema, opt) {
  options = Object.assign({
    confirmable: {
      tokenLifeSpan: 3
    },
    lockable: {
      tokenLifeSpan: 3,
      maximumAllowedFailedAttempts: 3
    },
    recoverable: {
      tokenLifeSpan: 3
    },
    registerable: {
      autoConfirm: false
    }
  }, opt);

  schema.methods.send = schema.methods.send || function (record, action, done) {
    done();
  };

  function stringFormat(key, values) {
    let message = options[key];
    if (values) {
      Object.keys(values).forEach(param => {
        message = message.replace(`{{${param}}}`, values[param]);
      });
    }
    return message;
  }

  function t(key, values) {
    return options.i18n ? options.i18n.t(key, values) : stringFormat(key, values);
  }
  schema.methods.t = schema.methods.t || t;
  schema.statics.t = schema.statics.t || t;

  (0, _authenticable2.default)(schema, options);
  (0, _registerable2.default)(schema, options);
  (0, _confirmable2.default)(schema, options);
  (0, _lockable2.default)(schema, options);
  (0, _recoverable2.default)(schema, options);
  (0, _trackable2.default)(schema);
};

require('./types/email');

var _authenticable = require('./models/authenticable');

var _authenticable2 = _interopRequireDefault(_authenticable);

var _registerable = require('./models/registerable');

var _registerable2 = _interopRequireDefault(_registerable);

var _confirmable = require('./models/confirmable');

var _confirmable2 = _interopRequireDefault(_confirmable);

var _lockable = require('./models/lockable');

var _lockable2 = _interopRequireDefault(_lockable);

var _recoverable = require('./models/recoverable');

var _recoverable2 = _interopRequireDefault(_recoverable);

var _trackable = require('./models/trackable');

var _trackable2 = _interopRequireDefault(_trackable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let options = {};