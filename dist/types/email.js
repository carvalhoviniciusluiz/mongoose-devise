'use strict';

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Email(path, options) {
  _mongoose2.default.SchemaType.call(this, path, options, 'Email');
}

Email.prototype = Object.create(_mongoose2.default.SchemaType.prototype);

Email.prototype.cast = function (email) {
  const Regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!Regex.test(email)) {
    throw new Error('Invalid email address');
  }
  return email;
};
_mongoose2.default.Schema.Types.Email = Email;