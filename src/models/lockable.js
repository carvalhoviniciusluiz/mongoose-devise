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
  options.accountLockedErrorMessage = options.accountLockedErrorMessage ||
    'Account locked. Check unlock instructions sent to you.'

  options.invalidUnlockTokenErrorMessage =
    options.invalidUnlockTokenErrorMessage || 'Invalid unlock token'

  options.unlockTokenExpiredErrorMessage =
    options.unlockTokenExpiredErrorMessage || 'Unlock token expired'

  // prepare common options
  options.tokenLifeSpan = options.lockable
    ? (options.lockable.tokenLifeSpan || 3) : 3

  // add lockable schema fields
  schema.add({
    failedAttempts: {
      type: Number,
      default: 0,
      index: true
    },
    lockedAt: {
      type: Date,
      default: null
    },
    unlockedAt: {
      type: Date,
      default: null
    },
    unlockToken: {
      type: String,
      default: null,
      index: true
    },
    unlockTokenSentAt: {
      type: Date,
      default: null
    },
    unlockTokenExpiryAt: {
      type: Date,
      default: null
    }
  })

  schema.methods.generateUnlockToken = function (opts = { save: true }) {
    assert.object(opts, 'opts')

    const self = this
    return new Promise(async (resolve, reject) => {
      try {
        // set unlock expiration date
        self.unlockTokenExpiryAt = addDays(options.tokenLifeSpan)

        // generate unlock token based on unlock token expiry at
        const tokenizer = genToken(self.unlockTokenExpiryAt.getTime().toString())

        // set unlockToken
        self.unlockToken = tokenizer.encrypt(self[options.authenticationField])

        // clear previous unlock details if any
        self.unlockedAt = null

        if (opts.save) {
          await self.save()
        }

        resolve(self)
      } catch (error) {
        reject(error)
      }
    })
  }

  schema.methods.sendUnlock = function (opts = { save: true }) {
    const self = this

    // check if already unlocked
    const isUnlocked = (self.unlockedAt && self.unlockedAt !== null)

    return new Promise(async (resolve, reject) => {
      // if already unlocked back-off
      if (isUnlocked) {
        return resolve(self)
      }

      // send unlock instructions
      self.send(self, 'account_recovery', async (callback) => {
        try {
          if (isFunction(callback)) {
            callback(opts)
          }

          // update unlock send time
          self.unlockTokenSentAt = new Date()

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

  schema.methods.isLocked = function () {
    const self = this

    // check if already locked
    const isLocked = (self.lockedAt && self.lockedAt !== null)

    // check if unlock token expired
    const isUnlockTokenExpired = !isAfter(new Date(), self.unlockTokenExpiryAt)

    return new Promise(async (resolve, reject) => {
      try {
        // account is not locked back-off
        if (!isLocked) {
          return resolve(false)
        }

        // is locked and unlock token is not expired
        if (isLocked && isUnlockTokenExpired) {
          await self.generateUnlockToken({ save: false })
          await self.sendUnlock()
        }

        throw new Error(this.t('accountLockedErrorMessage'))
      } catch (error) {
        reject(error)
      }
    })
  }

  schema.methods.resetFailedAttempts = function () {
    const self = this
    return new Promise(async (resolve, reject) => {
      try {
        // clear previous failed attempts
        self.failedAttempts = 0

        // save lockable instance and return it
        await self.save()

        resolve(true)
      } catch (error) {
        reject(error)
      }
    })
  }

  schema.methods.lock = function (opts) {
    const self = this

    // disable send unlock save
    !isObject(opts) ? opts = { save: false } : opts.save = false

    return new Promise(async (resolve, reject) => {
      try {
        // set locked date
        self.lockedAt = new Date()

        // generate unlock token
        await self.generateUnlockToken(opts)

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
        assert.object(lockable, this.t('invalidUnlockTokenErrorMessage'))

        // check if unlock token expired
        const isTokenExpired = !isAfter(new Date(), lockable.unlockTokenExpiryAt)

        // if expired
        if (isTokenExpired) {
          throw new Error(this.t('unlockTokenExpiredErrorMessage'))
        }

        // verify locktoken
        const value = lockable.unlockTokenExpiryAt.getTime().toString()
        const tokenizer = genToken(value)

        if (!tokenizer.match(unlockToken, lockable[options.authenticationField])) {
          throw new Error(this.t('invalidUnlockTokenErrorMessage'))
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
        parseError(error)
        reject(error)
      }
    })
  }
}
