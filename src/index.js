'use strict'

import './types/email'
import { authenticable } from './models/authenticable'
import { confirmable } from './models/confirmable'
import { lockable } from './models/lockable'
import { recoverable } from './models/recoverable'
import { registerable } from './models/registerable'
import { trackable } from './models/trackable'

let options = {}

export function devise (schema, opts) {
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
  }, opts)

  /*
  * format the string with the past values
  */
  function stringFormat (key, values) {
    let message = options[key]
    if (values) {
      Object.keys(values).forEach(param => {
        message = message.replace(`{{${param}}}`, values[param])
      })
    }
    return message
  }

  /*
  * implementation of translator method
  */
  function t (key, values) {
    return options.i18n
      ? options.i18n.t(key, values)
      : stringFormat(key, values)
  }

  /*
  * implementation of notification send
  */
  function sendNotification (record, action, done) {
    done()
  }

  schema.methods.sendNotification = schema.methods.send || sendNotification

  // i18n adapter methodos
  schema.methods.t = schema.methods.t || t
  schema.statics.t = schema.statics.t || t

  authenticable(schema, options)
  confirmable(schema, options)
  lockable(schema, options)
  recoverable(schema, options)
  registerable(schema, options)
  trackable(schema)
}

export default devise
