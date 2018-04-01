'use strict'

import assert from 'assert-plus'
import { genToken, addDays, isAfter, parseError, isFunction, isObject } from '../helpers'

let options = {}

export default function (schema, opt) {
  assert.func(schema.methods.send, 'send method')
  assert.func(schema.methods.t, 'translator method')
  assert.func(schema.statics.t, 'translator method')

  options = opt || {}

  // prepare authentication field
  options.authenticationField = options.authenticationField || 'email'

  // prepare error's messages
  options.invalidRecoveryDetailsErrorMessage =
    options.invalidRecoveryDetailsErrorMessage || 'Invalid recovery details'

  options.invalidRecoveryTokenErrorMessage =
    options.invalidRecoveryTokenErrorMessage || 'Invalid recovery token'

  options.recoveryTokenExpiredErrorMessage =
    options.recoveryTokenExpiredErrorMessage || 'Recovery token expired'

  options.authenticatorErrorMessage =
    options.authenticatorErrorMessage || `No ${options.authenticationField} provided`

  options.credentialsNotExistErrorMessage =
    options.credentialsNotExistErrorMessage || 'Incorrect credentials'

  // prepare common options
  options.tokenLifeSpan = options.recoverable
    ? (options.recoverable.tokenLifeSpan || 3) : 3

  // add confirmable schema fields
  schema.add({
    recoveryToken: {
      type: String,
      default: null,
      index: true
    },
    recoveryTokenExpiryAt: {
      type: Date,
      default: null
    },
    recoverySentAt: {
      type: Date,
      default: null
    },
    recoveredAt: {
      type: Date,
      default: null
    }
  })

  schema.methods.generateRecoveryToken = function (opts = { save: true }) {
    assert.object(opts, 'opts')

    const self = this
    return new Promise(async (resolve, reject) => {
      try {
        // set recovery expiration date
        self.recoveryTokenExpiryAt = addDays(options.tokenLifeSpan)

        // generate recovery token based on recovery token expiry at
        const tokenizer = genToken(self.recoveryTokenExpiryAt.getTime().toString())

        // set recoveryToken
        self.recoveryToken = tokenizer.encrypt(self[options.authenticationField])

        // clear previous recovery details if any
        self.recoveredAt = null

        if (opts.save) {
          await self.save()
        }

        resolve(self)
      } catch (error) {
        reject(error)
      }
    })
  }

  schema.methods.sendRecovery = function (opt = { save: true }) {
    const self = this

    // check if already recovered
    const isRecovered = (self.recoveredAt && self.recoveredAt !== null)

    return new Promise(async (resolve, reject) => {
      // if already recovered back-off
      if (isRecovered) {
        return resolve(self)
      }

      // send confirmation instruction
      self.send(self, 'password_recovery', async (callback) => {
        try {
          if (isFunction(callback)) {
            callback(opt)
          }

          // update recovery send time
          self.recoverySentAt = new Date()

          if (opt.save) {
            await self.save()
          }

          resolve(self)
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  schema.statics.requestRecover = function (credentials, opts) {
    const Recoverable = this

    // disable send recovery save
    !isObject(opts) ? opts = { save: false } : opts.save = false

    return new Promise(async (resolve, reject) => {
      try {
        assert.object(credentials, this.t('credentialsNotExistErrorMessage'))
        assert.ok(credentials[options.authenticationField], this.t('authenticatorErrorMessage', {
          field: options.authenticationField
        }))

        const criteria = {}
        criteria[options.authenticationField] = credentials[options.authenticationField]

        const recoverable = await Recoverable.findOne(criteria)
        assert.object(recoverable, this.t('invalidRecoveryDetailsErrorMessage'))

        // if already confirmed back-off
        if (isFunction(recoverable.isConfirmed)) {
          await recoverable.isConfirmed()
        }

        await recoverable.generateRecoveryToken(opts)
        await recoverable.sendRecovery(opts)
        await recoverable.save()

        resolve(recoverable)
      } catch (error) {
        parseError(error)
        reject(error)
      }
    })
  }

  schema.statics.recover = function (recoveryToken, newPassword) {
    const Recoverable = this

    return new Promise(async (resolve, reject) => {
      try {
        const recoverable = await Recoverable.findOne({ recoveryToken })
        assert.object(recoverable, this.t('invalidRecoveryTokenErrorMessage'))

        // check if recovery token expired
        const isTokenExpired = !isAfter(new Date(), recoverable.recoveryTokenExpiryAt)

        // if expired
        if (isTokenExpired) {
          throw new Error(this.t('recoveryTokenExpiredErrorMessage'))
        }

        // verify recovery token
        const value = recoverable.recoveryTokenExpiryAt.getTime().toString()
        const tokenizer = genToken(value)

        if (!tokenizer.match(recoveryToken, recoverable[options.authenticationField])) {
          throw new Error(this.t('invalidRecoveryTokenErrorMessage'))
        }

        // update recovery details
        recoverable.recoveredAt = new Date()

        // change password and save object
        if (isFunction(recoverable.encryptPassword)) {
          await recoverable.changePassword(newPassword)
        }

        resolve(recoverable)
      } catch (error) {
        parseError(error)
        reject(error)
      }
    })
  }
}
