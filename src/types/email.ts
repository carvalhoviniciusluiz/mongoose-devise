import mongoose from 'mongoose'

const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

declare module 'mongoose' {
  namespace Types {
    function Email (path: string, options: any): void
  }
  namespace Schema {
    namespace Types {
      function Email (path: string, options: any): void
    }
  }
}

export interface EmailOptions {
  required?: Function,
  allowBlank?: Boolean
}

function isEmail (val: string, options: EmailOptions): boolean {
  const required = (typeof options.required === 'function') ? options.required() : options.required
  const passedAllowBlank = options.allowBlank && (val === '' || val === null)
  if (passedAllowBlank && !required) {
    return true
  }
  return regex.test(val)
}

exports.isEmail = isEmail

function Email (path: string, options: any): void {
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
