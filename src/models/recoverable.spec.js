'use strict'

import faker from 'faker'
import { before, beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import devise from '..'

const Schema = mongoose.Schema

describe('Recoverable: models', () => {
  before((done) => {
    const RecoverableSchema = new Schema({})
    RecoverableSchema.plugin(devise)
    mongoose.model('Recoverable', RecoverableSchema)

    done()
  })

  beforeEach(async () => {
    await mongoose.model('Recoverable').remove()
  })

  describe('Recoverable Fields', () => {
    it('should have recovery fields', (done) => {
      const Recoverable = mongoose.model('Recoverable')

      expect(Recoverable.schema.paths).to.have.property('recoveryToken')
      expect(Recoverable.schema.paths).to.have.property('recoveryTokenExpiryAt')
      expect(Recoverable.schema.paths).to.have.property('recoverySentAt')
      expect(Recoverable.schema.paths).to.have.property('recoveredAt')

      done()
    })

    it('should be able to set custom recovery', async () => {
      const RecoverableSchema = new Schema({})

      RecoverableSchema.plugin(devise, {
        authenticationField: 'username',
        invalidRecoveryDetailsErrorMessage: '1',
        invalidRecoveryTokenErrorMessage: '2',
        recoveryTokenExpiredErrorMessage: '3',
        authenticatorErrorMessage: '4',
        credentialsNotExistErrorMessage: '5',
        recoverable: {
          tokenLifeSpan: 1
        }
      })
      const Recoverable = mongoose.model('RecoverableSchemaTest', RecoverableSchema)

      try {
        await Recoverable.requestRecover()
      } catch (error) {
        expect(error.message).to.equal('5')
      }

      try {
        await Recoverable.recover()
      } catch (error) {
        expect(error.message).to.equal('2')
      }
      // TODO test to invalidRecoveryDetailsErrorMessage
      // TODO test to recoveryTokenExpiredErrorMessage
      // TODO test to authenticatorErrorMessage
      // TODO test to recoverable object
    })
  })

  it('should be able to generate recovery token', async () => {
    const Recoverable = mongoose.model('Recoverable')
    const recoverable = new Recoverable({
      email: faker.internet.email(),
      password: faker.internet.password()
    })
    expect(recoverable.generateRecoveryToken).to.be.a('function')

    const res = await recoverable.generateRecoveryToken()
    expect(res.recoveryToken).to.not.be.null()
    expect(res.recoveryTokenExpiryAt).to.not.be.null()
  })

  it('should be able to send recovery instruction', async () => {
    const Recoverable = mongoose.model('Recoverable')
    const recoverable = new Recoverable({
      email: faker.internet.email(),
      password: faker.internet.password()
    })
    expect(recoverable.sendRecovery).to.be.a('function')

    await recoverable.generateRecoveryToken()
    await recoverable.sendRecovery()
    expect(recoverable.recoveryToken).to.not.be.null()
    expect(recoverable.recoverySentAt).to.not.be.null()
    expect(recoverable.recoveryExpiredAt).to.not.be.null()
  })

  it('should be able notify with account not confirmed', async () => {
    const Recoverable = mongoose.model('Recoverable')
    const recoverable = await Recoverable.register({
      email: faker.internet.email(),
      password: faker.internet.password()
    })
    expect(Recoverable.requestRecover).to.be.a('function')

    try {
      await Recoverable.requestRecover({ email: recoverable.email })
    } catch (error) {
      expect(error.message).to.equal('Account not confirmed')
    }
  })

  it('should be able to request recover account', async () => {
    const Recoverable = mongoose.model('Recoverable')
    const recoverable = await Recoverable.register({
      email: faker.internet.email(),
      password: faker.internet.password()
    })
    await Recoverable.confirm(recoverable.confirmationToken)

    expect(Recoverable.requestRecover).to.be.a('function')

    const res = await Recoverable.requestRecover({ email: recoverable.email })
    expect(res.recoveryToken).to.not.be.null()
    expect(res.recoveryTokenExpiryAt).to.not.be.null()
    expect(res.recoveryTokenSentAt).to.not.be.null()
  })

  it('should be able to recover account password', async () => {
    const Recoverable = mongoose.model('Recoverable')
    const recoverable = await Recoverable.register({
      email: faker.internet.email(),
      password: faker.internet.password()
    })
    await recoverable.generateRecoveryToken()
    await recoverable.sendRecovery()
    expect(Recoverable.recover).to.be.a('function')
    const res = await Recoverable.recover(recoverable.recoveryToken, faker.internet.password())
    expect(res.recoveredAt).to.not.be.null()
  })
})
