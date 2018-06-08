'use strict'

import './types/email'
import Authenticable from './models/authenticable'
import Registerable from './models/registerable'
import Confirmable from './models/confirmable'
import Lockable from './models/lockable'
import Recoverable from './models/recoverable'
import Trackable from './models/trackable'

let options = {}

export default function (schema, opt) {
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
  }, opt)

  // implementation of notification send
  schema.methods.send = schema.methods.send || function (record, action, done) {
    done()
  }

  // format the string with the past values
  function stringFormat (key, values) {
    let message = options[key]
    if (values) {
      Object.keys(values).forEach(param => {
        message = message.replace(`{{${param}}}`, values[param])
      })
    }
    return message
  }

  // implementation of translator method
  function t (key, values) {
    return options.i18n
      ? options.i18n.t(key, values)
      : stringFormat(key, values)
  }
  schema.methods.t = schema.methods.t || t
  schema.statics.t = schema.statics.t || t

  Authenticable(schema, options)
  Registerable(schema, options)
  Confirmable(schema, options)
  Lockable(schema, options)
  Recoverable(schema, options)
  Trackable(schema)
}
