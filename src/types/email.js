'use strict'

import mongoose from 'mongoose'

function Email (path, options) {
  mongoose.SchemaType.call(this, path, options, 'Email')
}

Email.prototype = Object.create(mongoose.SchemaType.prototype)

// http://www.w3.org/TR/html5/forms.html#valid-e-mail-address
Email.prototype.cast = function (email) {
  const Regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

  if (!Regex.test(email)) {
    throw new Error('Invalid email address')
  }
  return email
}
mongoose.Schema.Types.Email = Email
