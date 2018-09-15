'use strict'

import mongoose from 'mongoose'

const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

function isEmail (val, options) {
  const required = (typeof options.required === 'function') ? options.required() : options.required
  const passedAllowBlank = options.allowBlank && (val === '' || val === null)
  if (passedAllowBlank && !required) {
    return true
  }
  return regex.test(val)
}

exports.isEmail = isEmail

function Email (path, options) {
  mongoose.SchemaTypes.String.call(this, path, options)
  function isValid (val) {
    return isEmail(val, options)
  }
  this.validate(isValid, options.message || 'invalid email address')
}

Object.setPrototypeOf(Email.prototype, mongoose.SchemaTypes.String.prototype)

mongoose.Schema.Types.Email = Email
mongoose.Types.Email = String
module.exports = Email
