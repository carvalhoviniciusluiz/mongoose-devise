'use strict'

import assert from 'assert-plus'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { DeviseError } from '../errors'
import { Utils } from '../helpers'

// only the necessary functions
const { isObject } = Utils

const deviseError = new DeviseError()
deviseError.code = 'EAUTH'

export const hashedPassword = function (obj, next) {
  bcrypt.hash(obj[options.passwordField], 10)
    .then(hashed => {
      obj[options.passwordField] = hashed
      next()
    })
    .catch(next)
}

export const saveMiddlerware = function (next) {
  const self = this
  if (!self.isModified(options.passwordField)) {
    next()
  } else {
    hashedPassword(self, next)
  }
}

export const updateMiddlerware = function (next) {
  if (!this.getUpdate()[options.passwordField]) {
    next()
  } else {
    hashedPassword(this.getUpdate(), next)
  }
}

let options = {}

export function authenticable (schema, opts) {
  assert.func(schema.methods.t, 'translator method')
  assert.func(schema.statics.t, 'translator method')

  options = opts || {}

  options.authenticationField = options.authenticationField || 'email'
  options.authenticationFieldMessage = options.authenticationFieldMessage || undefined
  options.authenticationFieldType = options.authenticationFieldType || mongoose.Schema.Types.Email
  options.passwordField = options.passwordField || 'password'
  options.authenticatorError = options.authenticatorError || `No ${options.authenticationField} provided`
  options.passwordError = options.passwordError || 'No password provided'
  options.authenticatorNotExistError = options.authenticatorNotExistError || `Incorrect ${options.authenticationField}`
  options.credentialsNotExistError = options.credentialsNotExistError || 'Incorrect credentials'

  // prepare common options
  options.lockable.maximumAllowedFailedAttempts = options.lockable ? (options.lockable.maximumAllowedFailedAttempts || 3) : 3

  // prepare schema fields
  const authenticationFields = {}

  authenticationFields[options.authenticationField] = {
    type: options.authenticationFieldType,
    message: options.authenticationFieldMessage,
    unique: true,
    trim: true,
    index: true,
    required: true
  }

  authenticationFields[options.passwordField] = {
    type: String,
    required: true,
    select: false
  }

  // add authentibale fields into schema
  schema.add(authenticationFields)

  schema.pre('save', saveMiddlerware)
  schema.pre('findOneAndUpdate', updateMiddlerware)
  schema.pre('update', updateMiddlerware) // << deprecation
  schema.pre('updateOne', updateMiddlerware)
  schema.pre('updateMany', updateMiddlerware)

  schema.methods.validPassword = function (password) {
    const self = this

    if (!password) {
      return false
    }
    if (!self[options.passwordField]) {
      return false
    }

    return bcrypt.compareSync(password, self[options.passwordField])
  }

  schema.methods.authenticate = function (password, opts) {
    const self = this

    return new Promise(async (resolve, reject) => {
      if (!self.isConfirmed()) {
        const error = self.throwConfirmedError()
        return reject(error)
      }

      if (self.isLocked()) {
        const error = self.throwLockedError()
        return reject(error)
      }

      const passwordIsValid = self.validPassword(password)

      if (passwordIsValid) {
        self.failedAttempts = 0
        await self.track()
      } else {
        self.failedAttempts = self.failedAttempts + 1
        const failedAttemptsExceed = self.failedAttempts >= options.lockable.maximumAllowedFailedAttempts

        // the attempts exceeded the maximum allowed lock the account
        if (failedAttemptsExceed) {
          try {
            await self.lock(opts)
            return resolve(passwordIsValid)
          } catch (error) {
            return reject(error)
          }
        }
      }

      try {
        // updates the number of attempts made
        await self.save()
        resolve(passwordIsValid)
      } catch (error) {
        reject(error)
      }
    })
  }

  schema.statics.authenticate = function (credentials, opts) {
    const Authenticable = this

    return new Promise(async (resolve, reject) => {
      if (!isObject(credentials)) {
        deviseError.message = this.t('credentialsNotExistError')
        return reject(deviseError)
      }

      if (!credentials[options.passwordField]) {
        deviseError.message = this.t('passwordError')
        return reject(deviseError)
      }

      if (!credentials[options.authenticationField]) {
        deviseError.message = this.t('authenticatorError', {
          field: options.authenticationField
        })
        return reject(deviseError)
      }

      const criteria = {
        unregisteredAt: null // ensure authenticable is active
      }
      criteria[options.authenticationField] = credentials[options.authenticationField]
      const authenticable = await Authenticable.findOne(criteria, `+${options.passwordField}`)

      if (!authenticable) {
        deviseError.message = this.t('authenticatorNotExistError', {
          field: options.authenticationField
        })
        return reject(deviseError)
      }

      try {
        const res = await authenticable.authenticate(credentials[options.passwordField], opts)
        resolve(res ? authenticable : false)
      } catch (error) {
        reject(error)
      }
    })
  }
}
