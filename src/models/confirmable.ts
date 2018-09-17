import mongoose from 'mongoose'
import assert from 'assert-plus'

import { DeviseOptions } from '..'
import { Utils } from '../helpers'
import { DeviseError } from '../errors'

// only the necessary functions
const { genToken, addDays, isAfter, isFunction } = Utils

const deviseError = new DeviseError()
deviseError.code = 'ECONFIRM'

declare module 'mongoose' {
  interface Model<T extends Document> extends NodeJS.EventEmitter, ModelProperties {
    confirm (confirmationToken: string): Promise<mongoose.Model<T>|Error>
  }
  interface Document extends MongooseDocument, NodeJS.EventEmitter, ModelProperties {
    confirmationToken: string,
    confirmationTokenExpiryAt: string,
    confirmedAt: string,
    confirmationSentAt: string,
    throwConfirmedError (): Error
    hasConfirmationTokenExpired (): boolean
    isConfirmed (): boolean
    generateConfirmationToken (): void
    sendConfirmation (opts: object): void
    confirm (): Promise<boolean|Error>
  }
}

let options: DeviseOptions = {}

export function confirmable (schema: mongoose.Schema, opts?: DeviseOptions): void {
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

  // prepares an error message on a promise
  schema.methods.throwConfirmedError = function (): Error {
    deviseError.message = this.t('accountNotConfirmedError')
    return deviseError
  }

  // check if confirmation token expired
  schema.methods.hasConfirmationTokenExpired = function (): boolean {
    return !isAfter(new Date(), this.confirmationTokenExpiryAt)
  }

  // check if already confirmed
  schema.methods.isConfirmed = function (): boolean {
    return this.confirmedAt !== null
  }

  schema.methods.generateConfirmationToken = function (): void {
    const self: any = this

    // set confirmation expiration date
    self.confirmationTokenExpiryAt = addDays(options.confirmable.tokenLifeSpan)

    // generate confirmation token based on confirmation token expiry at
    const tokenizer: any = genToken(self.confirmationTokenExpiryAt.getTime().toString())

    // set confirmationToken
    self.confirmationToken = tokenizer.encrypt(self[options.authenticationField])

    // clear previous confirm details if any
    self.confirmedAt = null
  }

  // send confirmation instructions
  schema.methods.sendConfirmation = function (opts: object): void {
    const self: any = this

    self.sendNotification(self, 'account_confirmation', async (fn?: Function) => {
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

  schema.methods.confirm = function (): Promise<boolean | Error> {
    let self: any = this

    return new Promise(async (resolve, reject) => {
      if (!self.confirmationToken) {
        deviseError.message = this.t('invalidConfirmationTokenError')
        return reject(deviseError)
      }

      if (this.hasConfirmationTokenExpired()) {
        deviseError.message = this.t('confirmationTokenExpiredError')
        return reject(deviseError)
      }

      const val: any = self.confirmationTokenExpiryAt.getTime().toString()
      const tokenizer: any = genToken(val)
      const confirmed: boolean = tokenizer.match(self.confirmationToken, self[options.authenticationField])

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

  schema.statics.confirm = function (confirmationToken: string): Promise<any> {
    const Confirmable: any = this

    return new Promise(async (resolve, reject) => {
      const confirmable: any = await Confirmable.findOne({ confirmationToken })

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
