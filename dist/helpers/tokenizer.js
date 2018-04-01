'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var crypto = require('crypto');

function Tokenizer(secret) {
  this.cipher = crypto.createCipher('aes-256-cbc', secret);
  this.decipher = crypto.createDecipher('aes-256-cbc', secret);
}

Tokenizer.prototype.encrypt = function (text) {
  let crypted = this.cipher.update(text, 'utf8', 'hex');
  crypted += this.cipher.final('hex');
  return crypted;
};

Tokenizer.prototype.decrypt = function (text) {
  let dec = this.decipher.update(text, 'hex', 'utf8');
  dec += this.decipher.final('utf8');
  return dec;
};

Tokenizer.prototype.match = function (token, text) {
  return this.decrypt(token) === text;
};

const genToken = exports.genToken = secret => {
  return new Tokenizer(secret);
};