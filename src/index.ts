import mongoose from 'mongoose'

import { authenticable } from './models/authenticable'
import { confirmable } from './models/confirmable'
import { lockable } from './models/lockable'
import { recoverable } from './models/recoverable'
import { registerable } from './models/registerable'
import { trackable } from './models/trackable'

interface DeviseI18nOption {
  t: Function
}
interface DeviseConfirmableOption {
  tokenLifeSpan: number
}
interface DeviseLockableOption {
  tokenLifeSpan: number,
  maximumAllowedFailedAttempts: number
}
interface DeviseRecoverableOption {
  tokenLifeSpan: number
}
interface DeviseRegisterableOption {
  autoConfirm: boolean
}
export interface DeviseOptions {
  i18n?: DeviseI18nOption,
  confirmable?: DeviseConfirmableOption,
  lockable?: DeviseLockableOption,
  recoverable?: DeviseRecoverableOption,
  registerable?: DeviseRegisterableOption,

  // type of the authentication field
  authenticationFieldType?: string | Function,

  // path name of the authentication field
  authenticationField?: string,

  // path name of the authentication field message
  authenticationFieldMessage?: string,

  // path name of the password field
  passwordField?: string,

  // i18n: authenticable messages
  authenticatorError?: string,
  passwordError?: string,
  authenticatorNotExistError?: string,
  credentialsNotExistError?: string,

  // i18n: confirmable messages
  invalidConfirmationTokenError?: string,
  confirmationTokenExpiredError?: string,
  accountNotConfirmedError?: string,

  // i18n: registerable messages
  definitionsNotFoundError?: string,

  // i18n: lockable messages
  accountLockedError?: string,
  invalidUnlockTokenError?: string,
  unlockTokenExpiredError?: string,

  // i18n: recoverable messages
  accountWithoutAssociationError?: string,
  invalidRecoveryTokenError?: string,
  recoveryTokenExpiredError?: string
}

let options: DeviseOptions = {}

export function devise (schema: mongoose.Schema, opts?: DeviseOptions): void {
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
  function stringFormat (key: string, values: object) {
    let message = options[key]
    if (values) {
      Object.keys(values).forEach(val => {
        message = message.replace(`{{${val}}}`, values[val])
      })
    }
    return message
  }

  /*
  * implementation of translator method
  */
  function t (key: string, values: string[]) {
    return options.i18n
      ? options.i18n.t(key, values)
      : stringFormat(key, values)
  }

  /*
  * implementation of notification send
  */
  function sendNotification (_record: string, _action: string, done: Function): void {
    done()
  }

  schema.methods.sendNotification = schema.methods.sendNotification || sendNotification

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
