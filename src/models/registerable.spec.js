'use strict'

import faker from 'faker'
import { before, beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import { devise } from '..'

const Schema = mongoose.Schema

const credentials = {
  email: faker.internet.email().toLowerCase(),
  password: faker.internet.password()
}

describe('Registerable models', () => {
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
        definitionsNotFoundError: 'definitionsNotFoundError'
      })
      const Registerable = mongoose.model('RegisterableSchemaTest', RegisterableSchema)
      try {
        await Registerable.register()
      } catch (error) {
        expect(error.message).to.equal('definitionsNotFoundError')
      }
    })
  })

  it('should provide a valid email', async () => {
    const Registerable = mongoose.model('Registerable')
    expect(Registerable.register).to.be.a('function')
    try {
      await Registerable.register({
        email: 'email',
        password: faker.internet.password()
      })
    } catch (error) {
      expect(error.errors.email.message).to.equal('invalid email address')
    }
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
      await Registerable.register(credentials)
    } catch (error) {
      expect(error.message).to.equal(`E11000 duplicate key error collection: devise.registerables index: email_1 dup key: { : "${credentials.email}" }`)
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
})
