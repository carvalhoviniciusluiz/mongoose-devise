'use strict'

import assert from 'assert-plus'
import { DeviseError } from '../errors'
import { Utils } from '../helpers'

// only the necessary functions
const { genToken, addDays, isFunction, isAfter, isObject } = Utils

const deviseError = new DeviseError()
deviseError.code = 'ERECOV'

let options = {}

export function recoverable (schema, opts) {
  assert.func(schema.methods.sendNotification, 'sendNotification method')
  assert.func(schema.methods.t, 'translator method')
  assert.func(schema.statics.t, 'translator method')

  options = opts || {}

  options.authenticationField = options.authenticationField || 'email'
  options.passwordField = options.passwordField || 'password'
  options.accountWithoutAssociationError = options.accountWithoutAssociationError || `Account without association with ${options.authenticationField}`
  options.invalidRecoveryTokenError = options.invalidRecoveryTokenError || 'Invalid recovery token'
  options.recoveryTokenExpiredError = options.recoveryTokenExpiredError || 'Recovery token expired'
  options.authenticatorError = options.authenticatorError || `No ${options.authenticationField} provided`
  options.credentialsNotExistError = options.credentialsNotExistError || 'Incorrect credentials'
  // options.accountNotConfirmedError = options.accountNotConfirmedError || 'Account not confirmed'

  // prepare common options
  options.recoverable.tokenLifeSpan = options.recoverable ? (options.recoverable.tokenLifeSpan || 3) : 3

  // add confirmable schema fields
  schema.add({
    recoveryToken: {
      type: String,
      default: null,
      index: true
    },
    recoveryTokenExpiryAt: {
      type: Date,
      default: null,
      index: true
    },
    recoverySentAt: {
      type: Date,
      default: null,
      index: true
    },
    recoveredAt: {
      type: Date,
      default: null,
      index: true
    }
  })

  // check if recovery token expired
  schema.methods.hasRecoveryTokenExpired = function () {
    return !isAfter(new Date(), this.recoveryTokenExpiryAt)
  }

  schema.methods.generateRecoveryToken = function () {
    const self = this

    // set recovery expiration date
    self.recoveryTokenExpiryAt = addDays(options.recoverable.tokenLifeSpan)

    // generate recovery token based on recovery token expiry at
    const tokenizer = genToken(self.recoveryTokenExpiryAt.getTime().toString())

    // set recoveryToken
    self.recoveryToken = tokenizer.encrypt(self[options.authenticationField])

    // clear previous recovery details if any
    self.recoveredAt = null
  }

  schema.methods.sendRecovery = function (opts) {
    const self = this

    // send recoverable instructions
    self.sendNotification(self, 'password_recovery', async fn => {
      try {
        // update recovery send time
        self.recoverySentAt = new Date()

        if (isFunction(fn)) {
          await fn(opts)
        }
      } catch (error) {
        console.log(`[Error]: sendRecovery - ${error.stack}`)
      }
    })
  }

  schema.statics.requestRecover = function (credentials, opts) {
    const Recoverable = this

    return new Promise(async (resolve, reject) => {
      if (!isObject(credentials) || !credentials[options.authenticationField]) {
        deviseError.message = this.t('authenticatorError', {
          field: options.authenticationField
        })
        return reject(deviseError)
      }

      const criteria = {}
      criteria[options.authenticationField] = credentials[options.authenticationField]

      try {
        const recoverable = await Recoverable.findOne(criteria)
        if (!recoverable) {
          deviseError.message = this.t('accountWithoutAssociationError')
          return reject(deviseError)
        }

        // if (!recoverable.isConfirmed()) {
        //   deviseError.message = this.t('accountNotConfirmedError')
        //   reject(deviseError)
        // }

        // generate recovery token
        await recoverable.generateRecoveryToken()

        // send recovery notification
        await recoverable.sendRecovery(opts)
        await recoverable.save()

        resolve(recoverable)
      } catch (error) {
        reject(error)
      }
    })
  }

  schema.statics.recover = function (recoveryToken, newPassword) {
    const Recoverable = this
    return new Promise(async (resolve, reject) => {
      try {
        const recoverable = await Recoverable.findOne({ recoveryToken })
        if (!recoverable) {
          deviseError.message = this.t('invalidRecoveryTokenError')
          return reject(deviseError)
        }

        // if expired
        if (recoverable.hasRecoveryTokenExpired()) {
          deviseError.message = this.t('recoveryTokenExpiredError')
          return reject(deviseError)
        }

        // verify recovery token
        const val = recoverable.recoveryTokenExpiryAt.getTime().toString()
        const tokenizer = genToken(val)

        if (!tokenizer.match(recoveryToken, recoverable[options.authenticationField])) {
          deviseError.message = this.t('invalidRecoveryTokenError')
          return reject(deviseError)
        }

        // change password and save object
        recoverable[options.passwordField] = newPassword

        // update recovery details
        recoverable.recoveredAt = new Date()

        // prevent another attempt
        recoverable.recoveryToken = null
        await recoverable.save()

        resolve(recoverable)
      } catch (error) {
        reject(error)
      }
    })
  }
}
