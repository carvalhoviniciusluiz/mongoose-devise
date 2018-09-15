'use strict'

import assert from 'assert-plus'
import { DeviseError } from '../errors'
import { Utils } from '../helpers'

// only the necessary functions
const { genToken, addDays, isFunction, isAfter } = Utils

const deviseError = new DeviseError()
deviseError.code = 'ELOCK'

let options = {}

export function lockable (schema, opts) {
  assert.func(schema.methods.sendNotification, 'sendNotification method')
  assert.func(schema.methods.t, 'translator method')
  assert.func(schema.statics.t, 'translator method')

  options = opts || {}

  options.authenticationField = options.authenticationField || 'email'
  options.accountLockedError = options.accountLockedError || 'Account locked. Check unlock instructions sent to you.'
  options.invalidUnlockTokenError = options.invalidUnlockTokenError || 'Invalid unlock token'
  options.unlockTokenExpiredError = options.unlockTokenExpiredError || 'Unlock token expired'

  options.lockable.tokenLifeSpan = options.lockable ? (options.lockable.tokenLifeSpan || 3) : 3

  // add lockable schema fields
  schema.add({
    failedAttempts: {
      type: Number,
      default: 0,
      index: true
    },
    lockedAt: {
      type: Date,
      default: null,
      index: true
    },
    unlockedAt: {
      type: Date,
      default: null,
      index: true
    },
    unlockToken: {
      type: String,
      default: null,
      index: true
    },
    unlockTokenSentAt: {
      type: Date,
      default: null,
      index: true
    },
    unlockTokenExpiryAt: {
      type: Date,
      default: null,
      index: true
    }
  })

  // prepares an error message on a promise
  schema.methods.throwLockedError = function () {
    deviseError.message = this.t('accountLockedError')
    return deviseError
  }

  // check if unlock token expired
  schema.methods.hasUnlockTokenExpired = function () {
    return !isAfter(new Date(), this.unlockTokenExpiryAt)
  }

  // check if already locked
  schema.methods.isLocked = function () {
    return this.lockedAt !== null
  }

  schema.methods.generateUnlockToken = function () {
    const self = this

    // set unlock expiration date
    self.unlockTokenExpiryAt = addDays(options.lockable.tokenLifeSpan)

    // generate unlock token based on unlock token expiry at
    const tokenizer = genToken(self.unlockTokenExpiryAt.getTime().toString())

    // set unlockToken
    self.unlockToken = tokenizer.encrypt(self[options.authenticationField])

    // clear previous unlock details if any
    self.unlockedAt = null
  }

  schema.methods.sendUnlock = function (opts) {
    const self = this

    // send unlock instructions
    self.sendNotification(self, 'account_recovery', async fn => {
      try {
        // update unlock send time
        self.unlockTokenSentAt = new Date()

        if (isFunction(fn)) {
          await fn(opts)
        }
      } catch (error) {
        console.log(`[Error]: sendUnlock - ${error.stack}`)
      }
    })
  }

  schema.methods.lock = function (opts) {
    const self = this

    return new Promise(async (resolve, reject) => {
      try {
        // set locked date
        self.lockedAt = new Date()

        // generate unlock token
        await self.generateUnlockToken()

        // send unlock notification
        await self.sendUnlock(opts)

        await self.save()

        resolve(true)
      } catch (error) {
        reject(error)
      }
    })
  }

  schema.statics.unlock = function (unlockToken) {
    const Lockable = this

    return new Promise(async (resolve, reject) => {
      try {
        // find lockable using unlock token
        const lockable = await Lockable.findOne({ unlockToken })
        if (!lockable) {
          deviseError.message = this.t('invalidUnlockTokenError')
          return reject(deviseError)
        }

        // if expired
        if (lockable.hasUnlockTokenExpired()) {
          deviseError.message = this.t('unlockTokenExpiredError')
          return reject(deviseError)
        }

        // verify locktoken
        const val = lockable.unlockTokenExpiryAt.getTime().toString()
        const tokenizer = genToken(val)

        if (!tokenizer.match(unlockToken, lockable[options.authenticationField])) {
          deviseError.message = this.t('invalidUnlockTokenError')
          return reject(deviseError)
        }

        // update unlock details
        lockable.unlockedAt = new Date()

        // clear failed attempts
        lockable.failedAttempts = 0

        // clear lockedAt
        lockable.lockedAt = null

        // save lockable instance
        await lockable.save()

        resolve(lockable)
      } catch (error) {
        reject(error)
      }
    })
  }
}
