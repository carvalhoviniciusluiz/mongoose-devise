import mongoose from 'mongoose'
import assert from 'assert-plus'

import { DeviseOptions } from '..'
import { DeviseError } from '../errors'
import { Utils } from '../helpers'

// only the necessary functions
const { isFunction, isObject } = Utils

const deviseError = new DeviseError()
deviseError.code = 'EREGIST'

declare module 'mongoose' {
  interface Model<T extends Document> extends NodeJS.EventEmitter, ModelProperties {
    requestRecover (credentials: object, opts: object): Promise<mongoose.Model<T>|Error>
    recover (recoveryToken: string, newPassword: string): Promise<mongoose.Model<T>|Error>
  }
  interface Document extends MongooseDocument, NodeJS.EventEmitter, ModelProperties {
    registeredAt: string,
    unregisteredAt: string,
    unregister (beforeUnregister?: Function, afterUnregister?: Function): Promise<boolean|Error>
    register (opts: object): Promise<boolean|Error>
  }
}

let options: DeviseOptions = {}

export function registerable (schema: mongoose.Schema, opts?: DeviseOptions): void {
  assert.func(schema.methods.t, 'translator method')
  assert.func(schema.statics.t, 'translator method')

  options = opts || {}

  options.authenticationField = options.authenticationField || 'email'
  options.definitionsNotFoundError = options.definitionsNotFoundError || 'Definitions not found'

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

  schema.methods.unregister = async function (beforeUnregister?: Function, afterUnregister?: Function): Promise<any> {
    const self: any = this

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

  schema.methods.register = async function (opts: object): Promise<any> {
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

  schema.statics.register = function (definitions: object, opts: object): Promise<any> {
    const Registerable: any = this

    return new Promise(async (resolve, reject) => {
      if (!isObject(definitions)) {
        deviseError.message = this.t('definitionsNotFoundError')
        return reject(deviseError)
      }

      try {
        let registerable: any = new Registerable(definitions)
        await registerable.register(opts)

        resolve(registerable)
      } catch (error) {
        reject(error)
      }
    })
  }
}
