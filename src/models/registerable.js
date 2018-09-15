'use strict'

import assert from 'assert-plus'
import { DeviseError } from '../errors'
import { Utils } from '../helpers'

// only the necessary functions
const { isFunction, isObject } = Utils

const deviseError = new DeviseError()
deviseError.code = 'EREGIST'

let options = {}

export function registerable (schema, opts) {
  assert.func(schema.methods.t, 'translator method')
  assert.func(schema.statics.t, 'translator method')

  options = opts || {}

  options.authenticationField = options.authenticationField || 'email'
  options.definitionsNotFoundError = options.definitionsNotFoundError || 'Definitions not found'

  schema.add({
    // track when registration occur
    registeredAt: {
      type: Date,
      default: null,
      index: true
    },

    // track when account has been unregistered
    unregisteredAt: {
      type: Date,
      default: null,
      index: true
    }
  })

  schema.methods.unregister = async function (beforeUnregister, afterUnregister) {
    const self = this

    return new Promise(async (resolve, reject) => {
      try {
        if (isFunction(beforeUnregister)) {
          await beforeUnregister(self)
        }

        // set unregistered date
        self.unregisteredAt = new Date()

        // save unregistered details
        await self.save()

        if (isFunction(afterUnregister)) {
          await afterUnregister(self)
        }
        resolve(true)
      } catch (error) {
        reject(error)
      }
    })
  }

  schema.methods.register = async function (opts) {
    const self = this

    return new Promise(async (resolve, reject) => {
      // generate confirmation token if schema is confirmable
      await self.generateConfirmationToken()

      // set registering time
      self.registeredAt = new Date()

      // update confirmation send time
      self.confirmationSentAt = new Date()

      try {
        await self.save()

        // send confirmation instructions
        await self.sendConfirmation(opts)

        resolve(true)
      } catch (error) {
        reject(error)
      }
    })
  }

  schema.statics.register = function (definitions, opts) {
    const Registerable = this

    return new Promise(async (resolve, reject) => {
      if (!isObject(definitions)) {
        deviseError.message = this.t('definitionsNotFoundError')
        return reject(deviseError)
      }

      try {
        let registerable = new Registerable(definitions)
        await registerable.register(opts)

        resolve(registerable)
      } catch (error) {
        reject(error)
      }
    })
  }
}
