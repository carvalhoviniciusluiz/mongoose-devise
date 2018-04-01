'use strict'

import faker from 'faker'
import { before, beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import devise from '..'

const Schema = mongoose.Schema

describe('Confirmable: models', () => {
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
        invalidConfirmationTokenErrorMessage: '1',
        confirmationTokenExpiredErrorMessage: '2',
        accountNotConfirmedErrorMessage: '3',
        checkConfirmationTokenExpiredErrorMessage: '4',
        confirmable: {
          tokenLifeSpan: 1
        }
      })
      const Confirmable = mongoose.model('ConfirmableSchemaTest', ConfirmableSchema)

      try {
        await Confirmable.confirm()
      } catch (error) {
        expect(error.message).to.equal('1')
      }
      // TODO test to confirmationTokenExpiredErrorMessage
      // TODO test to accountNotConfirmedErrorMessage
      // TODO test to checkConfirmationTokenExpiredErrorMessage
      // TODO test to confirmable object
    })
  })

  it('should be able to generate confirmation token', async () => {
    const Confirmable = mongoose.model('Confirmable')
    const confirmable = new Confirmable({
      email: faker.internet.email(),
      password: faker.internet.password()
    })
    expect(confirmable.generateConfirmationToken).to.be.a('function')

    const res = await confirmable.generateConfirmationToken()
    expect(res.confirmationToken).to.not.be.null()
    expect(res.confirmationTokenExpiryAt).to.not.be.null()
  })

  it('should be able to send confirmation instructions', async function () {
    const Confirmable = mongoose.model('Confirmable')
    const confirmable = new Confirmable({
      email: faker.internet.email(),
      password: faker.internet.password()
    })
    expect(confirmable.sendConfirmation).to.be.a('function')

    await confirmable.sendConfirmation()
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
