'use strict'

import faker from 'faker'
import { before, beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import devise from '..'

const Schema = mongoose.Schema

describe('Authenticable: models', () => {
  let auth = {}
  let password = ''

  before((done) => {
    const AuthenticableSchema = new Schema({})
    AuthenticableSchema.plugin(devise)
    mongoose.model('Authenticable', AuthenticableSchema)

    done()
  })

  beforeEach((done) => {
    const Authenticable = mongoose.model('Authenticable')
    auth = new Authenticable({})
    password = faker.internet.password()
    done()
  })

  describe('Authenticable Fields', () => {
    it('should be able to set defaults authentication fields', (done) => {
      const Authenticable = mongoose.model('Authenticable')

      expect(Authenticable.schema.paths).to.have.property('email')
      expect(Authenticable.schema.paths).to.have.property('hash')
      expect(Authenticable.schema.paths).to.have.property('salt')

      done()
    })

    it('should be able to set custom authentication', async () => {
      const AuthenticableSchema = new Schema({})

      AuthenticableSchema.plugin(devise, {
        authenticationField: 'username',
        authenticationFieldType: Number,
        passwordField: 'secret',
        hashedPasswordField: 'hashedPassword',
        authenticatorErrorMessage: '1',
        passwordErrorMessage: '2',
        passwordNotMatchErrorMessage: '3',
        hashedPasswordErrorMessage: '4',
        authenticatorNotExistErrorMessage: '5',
        credentialsNotExistErrorMessage: '6'
      })

      const Authenticable = mongoose.model('AuthenticableSchemaTest', AuthenticableSchema)

      expect(Authenticable.schema.virtuals.secret).to.exist()
      expect(Authenticable.schema.paths.username).to.exist()
      expect(Authenticable.schema.paths.username.instance).to.be.equal('Number')
      expect(Authenticable.schema.paths.hashedPassword).to.exist()

      try {
        await Authenticable.authenticate({ password })
      } catch (error) {
        expect(error.message).to.equal('1')
      }
      try {
        await auth.encryptPassword()
      } catch (error) {
        expect(error.message).to.equal('2')
      }

      try {
        await auth.comparePassword(faker.internet.password())
      } catch (error) {
        expect(error.message).to.equal('4')
      }

      await auth.encryptPassword('secret')
      try {
        await auth.comparePassword(faker.internet.password())
      } catch (error) {
        expect(error.message).to.equal('3')
      }

      try {
        await Authenticable.authenticate({ username: 1, password })
      } catch (error) {
        expect(error.message).to.equal('5')
      }

      try {
        await Authenticable.authenticate('')
      } catch (error) {
        expect(error.message).to.equal('6')
      }
    })
  })

  it('should be able to encrypt password', async () => {
    expect(auth.encryptPassword).to.be.a('function')
    try {
      await auth.encryptPassword()
    } catch (error) {
      expect(error.message).to.equal('No password provided')
    }
    await auth.encryptPassword(password)
    expect(auth.hash).to.not.have.null()
    expect(auth.hash).to.not.have.undefined()
  })

  it('should be able to compare password with hash', async () => {
    await auth.encryptPassword(password)

    expect(auth.comparePassword).to.be.a('function')

    const Authenticable = mongoose.model('Authenticable')
    try {
      const newAuth = new Authenticable({})
      await newAuth.comparePassword('')
    } catch (error) {
      expect(error.message).to.equal('Hashed password not found')
    }

    try {
      await auth.comparePassword('')
    } catch (error) {
      expect(error.message).to.equal('No password provided')
    }

    try {
      await auth.comparePassword(faker.internet.password())
    } catch (error) {
      expect(error.message).to.equal('Incorrect password')
    }
    const res = await auth.comparePassword(password)
    expect(res).to.be.true()
  })

  it('should be able to change password', async () => {
    expect(auth.changePassword).to.be.a('function')
    try {
      await auth.changePassword()
    } catch (error) {
      expect(error.message).to.equal('No password provided')
    }

    const res = await auth.changePassword(password)
    expect(res).to.be.true()
    expect(auth.hash).to.not.have.undefined()
  })

  it('should have static authenticate method', (done) => {
    const Authenticable = mongoose.model('Authenticable')

    expect(Authenticable.authenticate).to.exist()
    expect(Authenticable.authenticate).to.be.a('function')

    done()
  })

  it('should have instance authenticate method', (done) => {
    expect(auth.authenticate).to.exist()
    expect(auth.authenticate).to.be.a('function')

    done()
  })

  it('should throw error when account not confirmed', async () => {
    const Authenticable = mongoose.model('Authenticable')

    const credentials = {
      password,
      email: faker.internet.email().toLowerCase()
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

    try {
      await Authenticable.authenticate()
    } catch (error) {
      expect(error.message).to.equal('Incorrect credentials')
    }

    try {
      await Authenticable.authenticate({})
    } catch (error) {
      expect(error.message).to.equal('No password provided')
    }

    try {
      await Authenticable.authenticate({ password })
    } catch (error) {
      expect(error.message).to.equal('No email provided')
    }

    const credentials = {
      password,
      email: faker.internet.email().toLowerCase()
    }

    const authenticable = await Authenticable.register(credentials)
    await Authenticable.confirm(authenticable.confirmationToken)
    const res = await Authenticable.authenticate(credentials)
    expect(res).to.not.have.null()
    expect(res).to.not.have.undefined()
    expect(res).to.not.have.false()
  })

  it('should throw error when authenticate credentials with invalid password', async () => {
    const Authenticable = mongoose.model('Authenticable')

    const credentials = {
      password,
      email: faker.internet.email().toLowerCase()
    }

    const authenticable = await Authenticable.register(credentials)
    await Authenticable.confirm(authenticable.confirmationToken)
    credentials.password = faker.internet.password()

    try {
      await Authenticable.authenticate(credentials)
    } catch (error) {
      expect(error.message).to.equal('Incorrect password') // 1 unsuccessful attempt
    }
    try {
      await Authenticable.authenticate(credentials)
    } catch (error) {
      expect(error.message).to.equal('Incorrect password') // 2 unsuccessful attempt
    }
    try {
      await Authenticable.authenticate(credentials)
    } catch (error) {
      expect(error.message).to.equal('Incorrect password') // 3 unsuccessful attempt
    }
    try {
      await Authenticable.authenticate(credentials)
    } catch (error) {
      expect(error.message).to.equal('Account locked. Check unlock instructions sent to you.')
    }
  })
})
