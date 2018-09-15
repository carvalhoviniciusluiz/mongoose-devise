'use strict'

import faker from 'faker'
import { before, describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import { devise } from '..'

const Schema = mongoose.Schema

describe('Authenticable models', () => {
  before(done => {
    const AuthenticableSchema = new Schema({})
    AuthenticableSchema.plugin(devise)
    mongoose.model('Authenticable', AuthenticableSchema)

    done()
  })

  describe('Authenticable Fields', () => {
    it('should be able to set defaults authentication fields', done => {
      const Authenticable = mongoose.model('Authenticable')
      expect(Authenticable.schema.paths).to.have.property('email')
      expect(Authenticable.schema.paths).to.have.property('password')

      done()
    })

    it('should be able to set custom fields', async () => {
      const AuthenticableSchema = new Schema({})
      AuthenticableSchema.plugin(devise, {
        authenticationField: 'username',
        authenticationFieldType: Number,
        passwordField: 'secret'
      })
      const Authenticable = mongoose.model('AuthenticableFieldsSchema', AuthenticableSchema)
      expect(Authenticable.schema.paths.username).to.exist()
      expect(Authenticable.schema.paths.username.instance).to.be.equal('Number')
      expect(Authenticable.schema.paths.secret).to.exist()
    })

    it('should be able to set custom messages', async () => {
      const AuthenticableSchema = new Schema({})
      AuthenticableSchema.plugin(devise, {
        authenticationFieldMessage: 'authenticationFieldMessage',
        authenticatorError: 'authenticatorError',
        passwordError: 'passwordError',
        authenticatorNotExistError: 'authenticatorNotExistError',
        credentialsNotExistError: 'credentialsNotExistError'
      })
      const Authenticable = mongoose.model('AuthenticableMessageSchema', AuthenticableSchema)
      try {
        await Authenticable.authenticate()
      } catch (error) {
        expect(error.message).to.equal('credentialsNotExistError')
      }
      try {
        await Authenticable.authenticate({})
      } catch (error) {
        expect(error.message).to.equal('passwordError')
      }
      try {
        await Authenticable.authenticate({ password: faker.internet.password() })
      } catch (error) {
        expect(error.message).to.equal('authenticatorError')
      }
      try {
        await Authenticable.authenticate({ email: 'email', password: faker.internet.password() })
      } catch (error) {
        expect(error.message).to.equal('authenticatorNotExistError')
      }
    })
  })

  it('should be able to encrypt password', async () => {
    const Authenticable = mongoose.model('Authenticable')
    const credentials = {
      password: faker.internet.password(),
      email: faker.internet.email()
    }
    const authenticable = new Authenticable(credentials)
    await authenticable.save()
    expect(authenticable.password).to.not.equal(credentials.password)
  })

  it('should be able to compare password', async () => {
    const Authenticable = mongoose.model('Authenticable')
    const credentials = {
      password: faker.internet.password(),
      email: faker.internet.email()
    }
    const authenticable = new Authenticable(credentials)
    await authenticable.save()
    expect(authenticable.validPassword(faker.internet.password())).to.be.false()
    expect(authenticable.validPassword(credentials.password)).to.be.true()
  })

  it('should be able to change password', async () => {
    const Authenticable = mongoose.model('Authenticable')
    const authenticable1 = new Authenticable({
      password: faker.internet.password(),
      email: faker.internet.email()
    })
    await authenticable1.save()
    const authenticable2 = await Authenticable.findById(authenticable1._id, '+password')
    authenticable2.password = faker.internet.password()
    await authenticable2.save()
    expect(authenticable1.password).to.not.equal(authenticable2.password)
  })

  it('should throw error when account not confirmed', async () => {
    const Authenticable = mongoose.model('Authenticable')
    const credentials = {
      password: faker.internet.password(),
      email: faker.internet.email()
    }
    await Authenticable.register(credentials)
    try {
      await Authenticable.authenticate(credentials)
    } catch (error) {
      expect(error.message).to.equal('Account not confirmed')
    }
  })

  it('should be able to authenticate credentials', async () => {
    const Authenticable = mongoose.model('Authenticable')
    expect(Authenticable.authenticate).to.be.a('function')
    const credentials = {
      password: faker.internet.password(),
      email: faker.internet.email()
    }
    const { confirmationToken } = await Authenticable.register(credentials)
    await Authenticable.confirm(confirmationToken)
    const authenticable1 = await Authenticable.authenticate(credentials)
    expect(authenticable1).to.not.have.false()
    expect(authenticable1._id).to.not.have.undefined()
    credentials.password = faker.internet.password()
    const authenticable2 = await Authenticable.authenticate(credentials)
    expect(authenticable2).to.have.false()
  })

  it('should be able to report that the account has been blocked', async () => {
    const Authenticable = mongoose.model('Authenticable')
    const credentials = {
      password: faker.internet.password(),
      email: faker.internet.email()
    }
    const authenticable = await Authenticable.register(credentials)
    await Authenticable.confirm(authenticable.confirmationToken)
    credentials.password = faker.internet.password()
    for (let i = 0; i < 2; i++) {
      await Authenticable.authenticate(credentials)
    }
    try {
      await Authenticable.authenticate(credentials)
    } catch (error) {
      expect(error.message).to.equal('Account locked. Check unlock instructions sent to you.')
    }
  })
})
