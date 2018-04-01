'use strict'

import assert from 'assert-plus'
import { parseError, isFunction } from '../helpers'

let options = {}

export default function (schema, opt) {
  assert.func(schema.methods.t, 'translator method')
  assert.func(schema.statics.t, 'translator method')

  options = opt || {}

  // prepare authentication field
  options.authenticationField = options.authenticationField || 'email'

  // prepare error's messages
  options.credentialsNotExistErrorMessage =
    options.credentialsNotExistErrorMessage || 'Incorrect credentials'

  options.authenticatorAlreadyExistErrorMessage =
    options.authenticatorAlreadyExistErrorMessage ||
    `Account of ${options.authenticationField} already exist`

  // prepare common options
  options.autoConfirm = options.registerable
    ? (options.registerable.autoConfirm || false) : false

  // add registerable schema fields
  schema.add({

    // track when registration occur
    registeredAt: {
      type: Date,
      default: null
    },

    // track when account has been unregistered
    unregisteredAt: {
      type: Date,
      default: null
    }
  })

  schema.statics.register = function (credentials, opts) {
    const Registerable = this

    // validate details
    return new Promise(async (resolve, reject) => {
      try {
        assert.object(credentials, this.t('credentialsNotExistErrorMessage'))

        const registerable = new Registerable(credentials)

        // validate details
        await registerable.validate()

        // generate confirmation token if schema is confirmable
        if (isFunction(registerable.generateConfirmationToken)) {
          await registerable.generateConfirmationToken()
        }

        // set registering time
        registerable.registeredAt = new Date()

        await registerable.save()

        // send a confirmation token if schema is confirmable and auto
        // confirmation is not enable
        if (isFunction(registerable.sendConfirmation) && !options.autoConfirm) {
          await registerable.sendConfirmation(opts)
        }

        // if auto confirm is enable and schema is confirmable confirm
        // account registration
        if (options.autoConfirm && isFunction(registerable.confirm)) {
          registerable.confirmationSentAt = new Date()
          await registerable.confirm()
        }

        resolve(registerable)
      } catch (error) {
        // check if unique constraint error is due to authentication field
        const regex = new RegExp(options.authenticationField, 'g')

        // handle MongoError: E11000 duplicate key error index on authentication
        // field and ignore others
        if (error.code === 11000 && regex.test(error.message)) {
          error.message = this.t('authenticatorAlreadyExistErrorMessage', {
            field: options.authenticationField
          })
        }
        parseError(error)
        reject(error)
      }
    })
  }

  schema.methods.unregister = function () {
    const self = this

    // TODO
    // fire events before unregister and after unregister

    return new Promise(async (resolve, reject) => {
      try {
        // set unregistered date
        self.unregisteredAt = new Date()

        // save unregistered details
        await self.save()

        resolve(true)
      } catch (error) {
        reject(error)
      }
    })
  }
}
