'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseError = exports.isAfter = exports.addDays = exports.isObject = exports.isFunction = exports.genToken = undefined;

var _tokenizer = require('./tokenizer');

Object.defineProperty(exports, 'genToken', {
  enumerable: true,
  get: function () {
    return _tokenizer.genToken;
  }
});

var _lodash = require('lodash');

Object.defineProperty(exports, 'isFunction', {
  enumerable: true,
  get: function () {
    return _lodash.isFunction;
  }
});
Object.defineProperty(exports, 'isObject', {
  enumerable: true,
  get: function () {
    return _lodash.isObject;
  }
});

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const addDays = exports.addDays = (offset, date) => {
  date = date || new Date();
  const momentAt = (0, _moment2.default)(date).add(offset, 'days');
  return momentAt.toDate();
};

const isAfter = exports.isAfter = (first, second) => {
  const firstMoment = (0, _moment2.default)(first);
  const secondMoment = (0, _moment2.default)(second);
  return secondMoment.isAfter(firstMoment);
};

const parseError = exports.parseError = error => {
  if (error.expected === 'object') {
    const e = error.message;
    error.message = e.slice(0, e.indexOf('(object)')).trim();
  }
};