'use strict'

import bcrypt from 'bcryptjs'
import assert from 'assert-plus'
import mongoose from 'mongoose'
import { isFunction, parseError } from '../helpers'

const Schema = mongoose.Schema
const Email = Schema.Types.Email

let options = {}

export default function (schema, opt) {
  assert.func(schema.methods.t, 'translator method')
  assert.func(schema.statics.t, 'translator method')

  options = opt || {}

  // prepare authentication field
  options.authenticationField = options.authenticationField || 'email'
  options.authenticationFieldType = options.authenticationFieldType || Email

  // prepare password field
  options.passwordField = options.passwordField || 'password'

  // prepare hashed password field
  options.hashedPasswordField = options.hashedPasswordField || 'hash'

  // prepare error's messages
  options.authenticatorErrorMessage =
    options.authenticatorErrorMessage || `No ${options.authenticationField} provided`

  options.passwordErrorMessage =
    options.passwordErrorMessage || 'No password provided'

  options.passwordNotMatchErrorMessage =
    options.passwordNotMatchErrorMessage || 'Incorrect password'

  options.hashedPasswordErrorMessage =
    options.hashedPasswordErrorMessage || 'Hashed password not found'

  options.saltErrorMessage =
    options.saltErrorMessage || 'Does not have salt'

  options.authenticatorNotExistErrorMessage =
    options.authenticatorNotExistErrorMessage || `Incorrect ${options.authenticationField}`

  options.credentialsNotExistErrorMessage =
    options.credentialsNotExistErrorMessage || 'Incorrect credentials'

  // prepare common options
  options.maximumAllowedFailedAttempts = options.lockable
    ? (options.lockable.maximumAllowedFailedAttempts || 3) : 3

  // prepare schema fields
  const authenticationFields = {}

  // prepare authentication field
  authenticationFields[options.authenticationField] = {
    type: options.authenticationFieldType,
    lowercase: true,
    unique: true,
    trim: true,
    index: true
  }

  // prepare hashed password field
  authenticationFields[options.hashedPasswordField] = {
    type: String
  }

  // prepare salt field
  authenticationFields.salt = {
    type: String
  }

  // add authentibale fields into schema
  schema.add(authenticationFields)

  // trigger function
  schema.virtual(options.passwordField).set(function (password) {
    const scope = this
    scope.encryptPassword(password)
  })

  schema.methods.encryptPassword = function (password) {
    const self = this
    try {
      assert.ok(password, this.t('passwordErrorMessage'))

      if (!self.salt) {
        self.salt = bcrypt.genSaltSync(10)
      }

      self.hash = bcrypt.hashSync(password, self.salt)
    } catch (error) {
      throw error
    }
  }

  schema.methods.comparePassword = async function (password) {
    const self = this
    return new Promise(async (resolve, reject) => {
      try {
        assert.ok(self.hash, this.t('hashedPasswordErrorMessage'))
        assert.ok(password, this.t('passwordErrorMessage'))

        const res = bcrypt.compareSync(password, self.hash)
        assert.ok(res, this.t('passwordNotMatchErrorMessage'))

        // password do match
        resolve(true)
      } catch (error) {
        // if there is any error during comparison
        reject(error)
      }
    })
  }

  schema.methods.changePassword = async function (newPassword) {
    const self = this
    return new Promise(async (resolve, reject) => {
      try {
        await self.encryptPassword(newPassword)
        await self.save()

        resolve(true)
      } catch (error) {
        reject(error)
      }
    })
  }

  schema.statics.authenticate = async function (credentials, opts) {
    const Authenticable = this
    return new Promise(async (resolve, reject) => {
      try {
        assert.object(credentials, this.t('credentialsNotExistErrorMessage'))
        assert.ok(credentials.password, this.t('passwordErrorMessage'))
        assert.ok(credentials[options.authenticationField], this.t('authenticatorErrorMessage', {
          field: options.authenticationField
        }))

        const criteria = {}
        criteria[options.authenticationField] = credentials[options.authenticationField]

        // ensure authenticable is active
        criteria.unregisteredAt = null

        const authenticable = await Authenticable.findOne(criteria)
        assert.object(authenticable, this.t('authenticatorNotExistErrorMessage', {
          field: options.authenticationField
        }))

        await authenticable.authenticate(credentials.password, opts)

        resolve(authenticable)
      } catch (error) {
        parseError(error)
        reject(error)
      }
    })
  }

  schema.methods.authenticate = async function (password, opts) {
    const self = this
    return new Promise(async (resolve, reject) => {
      try {
        // check account if is confirmed only if schema is confirmable
        if (isFunction(self.isConfirmed)) {
          await self.isConfirmed()
        }

        // check if account is locked only if account is lockable
        if (isFunction(self.isLocked)) {
          await self.isLocked()
        }

        await self.comparePassword(password)

        // clear previous failed attempts and save authenticable instance
        if (isFunction(self.resetFailedAttempts)) {
          await self.resetFailedAttempts()
        }

        resolve(true)
      } catch (error) {
        if (self.confirmedAt !== null) {
          // update failed attempts
          self.failedAttempts = self.failedAttempts + 1

          // is failed attempts exceed maximum allowed attempts
          const failedAttemptsExceed =
            self.failedAttempts >= options.maximumAllowedFailedAttempts

          // lock account and throw account locked error
          if (failedAttemptsExceed) {
            await self.lock(opts)
          }

          // failed attempts are less than maximum allowed failed attempts
          // save authenticable and return password does not match error
          await self.save()
        }
        reject(error)
      }
    })
  }
}
