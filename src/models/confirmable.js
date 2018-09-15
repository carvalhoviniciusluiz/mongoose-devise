'use strict'

import assert from 'assert-plus'
import { Utils } from '../helpers'
import { DeviseError } from '../errors'

// only the necessary functions
const { genToken, addDays, isAfter, isFunction } = Utils

const deviseError = new DeviseError()
deviseError.code = 'ECONFIRM'

let options = {}

export function confirmable (schema, opts) {
  assert.func(schema.methods.sendNotification, 'sendNotification method')
  assert.func(schema.methods.t, 'translator method')
  assert.func(schema.statics.t, 'translator method')

  options = opts || {}

  options.authenticationField = options.authenticationField || 'email'
  options.invalidConfirmationTokenError = options.invalidConfirmationTokenError || 'Invalid confirmation token'
  options.confirmationTokenExpiredError = options.confirmationTokenExpiredError || 'Confirmation token expired'
  options.accountNotConfirmedError = options.accountNotConfirmedError || 'Account not confirmed'

  // prepare common options
  options.confirmable.tokenLifeSpan = options.confirmable ? (options.confirmable.tokenLifeSpan || 3) : 3

  // add confirmable schema fields
  schema.add({
    confirmationToken: {
      type: String,
      default: null,
      index: true
    },
    confirmationTokenExpiryAt: {
      type: Date,
      default: null,
      index: true
    },
    confirmedAt: {
      type: Date,
      default: null,
      index: true
    },
    confirmationSentAt: {
      type: Date,
      default: null,
      index: true
    }
  })

  // prepares an error message on a promise
  schema.methods.throwConfirmedError = function () {
    deviseError.message = this.t('accountNotConfirmedError')
    return deviseError
  }

  // check if confirmation token expired
  schema.methods.hasConfirmationTokenExpired = function () {
    return !isAfter(new Date(), this.confirmationTokenExpiryAt)
  }

  // check if already confirmed
  schema.methods.isConfirmed = function () {
    return this.confirmedAt !== null
  }

  schema.methods.generateConfirmationToken = function () {
    const self = this

    // set confirmation expiration date
    self.confirmationTokenExpiryAt = addDays(options.confirmable.tokenLifeSpan)

    // generate confirmation token based on confirmation token expiry at
    const tokenizer = genToken(self.confirmationTokenExpiryAt.getTime().toString())

    // set confirmationToken
    self.confirmationToken = tokenizer.encrypt(self[options.authenticationField])

    // clear previous confirm details if any
    self.confirmedAt = null
  }

  schema.methods.sendConfirmation = function (opts) {
    const self = this

    // send confirmation instructions
    self.sendNotification(self, 'account_confirmation', async fn => {
      try {
        // update confirmation send time
        self.confirmationSentAt = new Date()

        if (isFunction(fn)) {
          await fn(opts)
        }
      } catch (error) {
        console.log(`[Error]: sendConfirmation - ${error.stack}`)
      }
    })
  }

  schema.methods.confirm = function () {
    let self = this

    return new Promise(async (resolve, reject) => {
      if (!self.confirmationToken) {
        deviseError.message = this.t('invalidConfirmationTokenError')
        return reject(deviseError)
      }

      if (this.hasConfirmationTokenExpired()) {
        deviseError.message = this.t('confirmationTokenExpiredError')
        return reject(deviseError)
      }

      const val = self.confirmationTokenExpiryAt.getTime().toString()
      const tokenizer = genToken(val)
      const confirmed = tokenizer.match(self.confirmationToken, self[options.authenticationField])

      // if the confirmation token is valid
      if (!confirmed) {
        deviseError.message = this.t('invalidConfirmationTokenError')
        return reject(deviseError)
      }

      self.confirmedAt = new Date()

      try {
        await self.save()
      } catch (error) {
        return reject(error)
      }
      resolve(confirmed)
    })
  }

  schema.statics.confirm = function (confirmationToken) {
    const Confirmable = this

    return new Promise(async (resolve, reject) => {
      const confirmable = await Confirmable.findOne({ confirmationToken })

      if (!confirmable) {
        deviseError.message = this.t('invalidConfirmationTokenError')
        return reject(deviseError)
      }

      try {
        await confirmable.confirm()
      } catch (error) {
        return reject(error)
      }
      resolve(confirmable)
    })
  }
}
