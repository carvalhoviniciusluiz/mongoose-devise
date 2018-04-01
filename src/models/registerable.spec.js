'use strict'

import faker from 'faker'
import { before, beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import devise from '..'

const Schema = mongoose.Schema

const credentials = {
  email: faker.internet.email().toLowerCase(),
  password: faker.internet.password()
}

describe('Registerable: models', () => {
  before((done) => {
    const RegisterableSchema = new Schema({})
    RegisterableSchema.plugin(devise)
    mongoose.model('Registerable', RegisterableSchema)

    done()
  })

  beforeEach(async () => {
    await mongoose.model('Registerable').remove()
  })

  describe('Registerable Fields', () => {
    it('should be able to set defaults registration fields', (done) => {
      const Registerable = mongoose.model('Registerable')
      expect(Registerable.schema.paths).to.have.property('registeredAt')
      expect(Registerable.schema.paths).to.have.property('unregisteredAt')

      done()
    })

    it('should be able to set custom registration', async () => {
      const RegisterableSchema = new Schema({})

      RegisterableSchema.plugin(devise, {
        authenticationField: 'username',
        credentialsNotExistErrorMessage: '1',
        authenticatorAlreadyExistErrorMessage: '2',
        registerable: {
          autoConfirm: false
        }
      })
      const Registerable = mongoose.model('RegisterableSchemaTest', RegisterableSchema)

      try {
        await Registerable.register()
      } catch (error) {
        expect(error.message).to.equal('1')
      }

      // TODO test to authenticatorAlreadyExistErrorMessage
      // TODO test to registerable object
    })
  })

  it('should have register function', (done) => {
    const Registerable = mongoose.model('Registerable')
    expect(Registerable.register).to.be.a('function')

    done()
  })

  it('should be able to register', async () => {
    const Registerable = mongoose.model('Registerable')

    const res = await Registerable.register(credentials)
    expect(res.registeredAt).to.not.be.null()
    expect(res.email).to.be.equal(credentials.email)
  })

  it('should not be able to register with authentication field which is already taken', async () => {
    const Registerable = mongoose.model('Registerable')
    try {
      await Registerable.register(credentials)
    } catch (error) {
      expect(error.message).to.equal('Account of email already exist')
    }
  })

  it('should be able to unregister', async () => {
    const Registerable = mongoose.model('Registerable')

    const register = await Registerable.register({
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password()
    })
    const registerable = await register.unregister()
    expect(registerable.unregisteredAt).to.not.be.null()
  })

  it('should be able to auto confirm registration', async () => {
    var RegisterableAutoConfirmSchema = new Schema({})
    RegisterableAutoConfirmSchema.plugin(devise, {
      registerable: {
        autoConfirm: true
      }
    })

    var Registerable = mongoose.model('RegisterableAutoConfirm', RegisterableAutoConfirmSchema)

    const credentials = {
      password: faker.internet.password(),
      email: faker.internet.email().toLowerCase()
    }

    const registerable = await Registerable.register(credentials)
    expect(registerable.registeredAt).to.not.be.null()
    expect(registerable.email).to.be.equal(credentials.email)
    expect(registerable.confirmationToken).to.not.be.null()
    expect(registerable.confirmedAt).to.not.be.null()
  })
})
