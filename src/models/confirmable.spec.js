'use strict'

import faker from 'faker'
import { before, beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import { devise } from '..'

const Schema = mongoose.Schema

describe('Confirmable models', () => {
  before((done) => {
    const ConfirmableSchema = new Schema({})
    ConfirmableSchema.plugin(devise)
    mongoose.model('Confirmable', ConfirmableSchema)

    done()
  })

  beforeEach(async () => {
    await mongoose.model('Confirmable').remove()
  })

  describe('Confirmable Fields', () => {
    it('should have confirmation fields', (done) => {
      const Confirmable = mongoose.model('Confirmable')
      expect(Confirmable.schema.paths).to.have.property('confirmationToken')
      expect(Confirmable.schema.paths).to.have.property('confirmationTokenExpiryAt')
      expect(Confirmable.schema.paths).to.have.property('confirmedAt')
      expect(Confirmable.schema.paths).to.have.property('confirmationSentAt')

      done()
    })

    it('should be able to set custom confirmation', async () => {
      const ConfirmableSchema = new Schema({})
      ConfirmableSchema.plugin(devise, {
        authenticationField: 'username',
        invalidConfirmationTokenError: 'invalidConfirmationTokenError',
        confirmationTokenExpiredError: 'confirmationTokenExpiredError',
        accountNotConfirmedError: 'accountNotConfirmedError'
      })
      const Confirmable = mongoose.model('ConfirmableSchemaTest', ConfirmableSchema)
      try {
        await Confirmable.confirm()
      } catch (error) {
        expect(error.message).to.equal('invalidConfirmationTokenError')
      }
      // TODO test to confirmationTokenExpiredError
      // TODO test to accountNotConfirmedError
    })
  })

  it('should be able to generate confirmation token', async () => {
    const Confirmable = mongoose.model('Confirmable')
    const confirmable = new Confirmable({
      email: faker.internet.email(),
      password: faker.internet.password()
    })
    expect(confirmable.generateConfirmationToken).to.be.a('function')
    confirmable.generateConfirmationToken()
    expect(confirmable.confirmationToken).to.not.be.null()
    expect(confirmable.confirmationTokenExpiryAt).to.not.be.null()
  })

  it('should be able to send confirmation instructions', async function () {
    const Confirmable = mongoose.model('Confirmable')
    const confirmable = new Confirmable({
      email: faker.internet.email(),
      password: faker.internet.password()
    })
    expect(confirmable.sendConfirmation).to.be.a('function')
    confirmable.sendConfirmation()
    expect(confirmable.confirmationSentAt).to.not.be.null()
  })

  it('should be able to confirm registration', async function () {
    const Confirmable = mongoose.model('Confirmable')
    const registerable = await Confirmable.register({
      email: faker.internet.email(),
      password: faker.internet.password()
    })
    const res = await Confirmable.confirm(registerable.confirmationToken)
    expect(res.confirmedAt).to.not.be.null()
  })

  it('should have instance isConfirmed method', (done) => {
    const Confirmable = mongoose.model('Confirmable')
    const confirmable = new Confirmable({})
    expect(confirmable.isConfirmed).to.exist()
    expect(confirmable.isConfirmed).to.be.a('function')

    done()
  })
})
