'use strict'

import assert from 'assert-plus'
import { genToken, addDays, isAfter, parseError, isFunction } from '../helpers'

let options = {}

export default function (schema, opt) {
  assert.func(schema.methods.send, 'send method')
  assert.func(schema.methods.t, 'translator method')
  assert.func(schema.statics.t, 'translator method')

  options = opt || {}

  // prepare authentication field
  options.authenticationField = options.authenticationField || 'email'

  // prepare error's messages
  options.invalidConfirmationTokenErrorMessage =
    options.invalidConfirmationTokenErrorMessage || 'Invalid confirmation token'

  options.confirmationTokenExpiredErrorMessage =
    options.confirmationTokenExpiredErrorMessage || 'Confirmation token expired'

  options.accountNotConfirmedErrorMessage =
    options.accountNotConfirmedErrorMessage || 'Account not confirmed'

  options.checkConfirmationTokenExpiredErrorMessage =
    options.checkConfirmationTokenExpiredErrorMessage ||
    'Confirmation token expired. Check your email for confirmation instructions.'

  // prepare common options
  options.tokenLifeSpan = options.confirmable
    ? (options.confirmable.tokenLifeSpan || 3) : 3

  // add confirmable schema fields
  schema.add({
    confirmationToken: {
      type: String,
      default: null,
      index: true
    },
    confirmationTokenExpiryAt: {
      type: Date,
      default: null
    },
    confirmedAt: {
      type: Date,
      default: null
    },
    confirmationSentAt: {
      type: Date,
      default: null
    }
  })

  schema.methods.generateConfirmationToken = function (opts = { save: true }) {
    assert.object(opts, 'opts')

    const self = this
    return new Promise(async (resolve, reject) => {
      try {
        // set confirmation expiration date
        self.confirmationTokenExpiryAt = addDays(options.tokenLifeSpan)

        // generate confirmation token based on confirmation token expiry at
        const tokenizer = genToken(self.confirmationTokenExpiryAt.getTime().toString())

        // set confirmationToken
        self.confirmationToken = tokenizer.encrypt(self[options.authenticationField])

        // clear previous confirm details if any
        self.confirmedAt = null

        if (opts.save) {
          await self.save()
        }

        resolve(self)
      } catch (error) {
        reject(error)
      }
    })
  }

  schema.methods.sendConfirmation = function (opts = { save: true }) {
    const self = this

    // check if already confirmed
    const isConfirmed = (self.confirmedAt && self.confirmedAt !== null)

    return new Promise(async (resolve, reject) => {
      // if already confirmed back-off
      if (isConfirmed) {
        return resolve(self)
      }

      // send confirmation instruction
      self.send(self, 'account_confirmation', async (callback) => {
        try {
          if (isFunction(callback)) {
            callback(opts)
          }

          // update confirmation send time
          self.confirmationSentAt = new Date()

          if (opts.save) {
            await self.save()
          }

          resolve(self)
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  schema.methods.isConfirmed = function () {
    const self = this

    // check if already confirmed
    const isConfirmed = (self.confirmedAt && self.confirmedAt !== null)

    // check if confirmation token expired
    const isTokenExpired = !isAfter(new Date(), self.confirmationTokenExpiryAt)

    return new Promise(async (resolve, reject) => {
      try {
        // account has not been confirmed and token has not yet expire
        if (!isConfirmed && !isTokenExpired) {
          throw new Error(this.t('accountNotConfirmedErrorMessage'))
        }

        // account has not been confirmed and confirmation token is expired
        if (!isConfirmed && isTokenExpired) {
          await self.generateConfirmationToken({ save: false })
          await self.sendConfirmation()

          throw new Error(this.t('checkConfirmationTokenExpiredErrorMessage'))
        }

        resolve(isConfirmed)
      } catch (error) {
        reject(error)
      }
    })
  }

  schema.statics.confirm = function (confirmationToken) {
    const Confirmable = this

    return new Promise(async (resolve, reject) => {
      try {
        const confirmable = await Confirmable.findOne({ confirmationToken })
        assert.object(confirmable, this.t('invalidConfirmationTokenErrorMessage'))

        await confirmable.confirm()

        resolve(confirmable)
      } catch (error) {
        parseError(error)
        reject(error)
      }
    })
  }

  schema.methods.confirm = function () {
    let self = this

    // check if confirmation token expired
    const isTokenExpired = !isAfter(new Date(), self.confirmationTokenExpiryAt)

    return new Promise(async (resolve, reject) => {
      try {
        if (!self.confirmationToken) {
          throw new Error(this.t('invalidConfirmationTokenErrorMessage'))
        }

        if (isTokenExpired) {
          throw new Error(this.t('confirmationTokenExpiredErrorMessage'))
        }

        // otherwise continue with token verification
        const value = self.confirmationTokenExpiryAt.getTime().toString()
        const tokenizer = genToken(value)

        // verifies that the token validates the authentication field
        const validConfirmation = tokenizer.match(self.confirmationToken, self[options.authenticationField])
        if (!validConfirmation) {
          throw new Error(this.t('invalidConfirmationTokenErrorMessage'))
        }

        // update confirmation details
        self.confirmedAt = new Date()

        await self.save()

        resolve(validConfirmation)
      } catch (error) {
        reject(error)
      }
    })
  }
}
