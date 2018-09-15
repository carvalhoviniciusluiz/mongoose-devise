'use strict'

import faker from 'faker'
import { before, beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import { devise } from '..'

const Schema = mongoose.Schema

describe('Lockable models', () => {
  before((done) => {
    const LockableSchema = new Schema({})
    LockableSchema.plugin(devise)
    mongoose.model('Lockable', LockableSchema)

    done()
  })

  beforeEach(async () => {
    await mongoose.model('Lockable').remove()
  })

  describe('Lockable Fields', () => {
    it('should have lockation fields', (done) => {
      const Lockable = mongoose.model('Lockable')
      expect(Lockable.schema.paths).to.have.property('failedAttempts')
      expect(Lockable.schema.paths).to.have.property('lockedAt')
      expect(Lockable.schema.paths).to.have.property('unlockedAt')
      expect(Lockable.schema.paths).to.have.property('unlockToken')
      expect(Lockable.schema.paths).to.have.property('unlockTokenExpiryAt')

      done()
    })

    it('should be able to set custom lockation', async () => {
      const LockableSchema = new Schema({})
      LockableSchema.plugin(devise, {
        authenticationField: 'username',
        accountLockedError: 'accountLockedError',
        invalidUnlockTokenError: 'invalidUnlockTokenError',
        unlockTokenExpiredError: 'unlockTokenExpiredError'
      })
      const Lockable = mongoose.model('LockableSchemaTest', LockableSchema)
      try {
        await Lockable.unlock()
      } catch (error) {
        expect(error.message).to.equal('invalidUnlockTokenError')
      }
      // TODO test to accountLockedError
      // TODO test to unlockTokenExpiredError
    })
  })

  it('should be able to generate confirmation token', async () => {
    const Lockable = mongoose.model('Lockable')
    const lockable = new Lockable({
      email: faker.internet.email(),
      password: faker.internet.password()
    })
    expect(lockable.generateUnlockToken).to.be.a('function')
    lockable.generateUnlockToken()
    expect(lockable.unlockToken).to.not.be.null()
    expect(lockable.unlockTokenExpiryAt).to.not.be.null()
  })

  it('should be able to send unlock instructions', async () => {
    const Lockable = mongoose.model('Lockable')
    const lockable = new Lockable({
      email: faker.internet.email(),
      password: faker.internet.password()
    })
    expect(lockable.sendUnlock).to.be.a('function')
    lockable.sendUnlock()
    expect(lockable.unlockTokenSentAt).to.not.be.null()
  })

  it('should be able to lock account', async () => {
    const Lockable = mongoose.model('Lockable')
    const lockable = new Lockable({
      email: faker.internet.email(),
      password: faker.internet.password()
    })
    expect(lockable.lock).to.be.a('function')
    await lockable.lock()
    expect(lockable.lockedAt).to.not.be.null()
  })

  it('should be able to check if account is locked', async () => {
    const Lockable = mongoose.model('Lockable')
    const lockable = new Lockable({
      email: faker.internet.email(),
      password: faker.internet.password()
    })
    expect(lockable.isLocked).to.be.a('function')
    expect(lockable.isLocked()).to.be.false()
    await lockable.lock()
    expect(lockable.isLocked()).to.be.true()
  })

  it('should be able to unlock account', async () => {
    const Lockable = mongoose.model('Lockable')
    const lockable = await Lockable.register({
      password: faker.internet.password(),
      email: faker.internet.email().toLowerCase()
    })
    lockable.generateUnlockToken()
    await lockable.lock()
    expect(Lockable.unlock).to.be.a('function')
    const res = await Lockable.unlock(lockable.unlockToken)
    expect(res.unlockedAt).to.not.be.null()
    expect(res.lockedAt).to.be.null()
    expect(res.failedAttempts).to.equal(0)
  })

  it('should not be able to authenticate locked account', async () => {
    const Lockable = mongoose.model('Lockable')
    const credentials = {
      email: faker.internet.email(),
      password: faker.internet.password(),
      failedAttempts: 5
    }
    const lockable = new Lockable(credentials)
    lockable.generateConfirmationToken()
    await lockable.confirm(lockable.confirmationToken)
    await lockable.lock()
    try {
      await lockable.authenticate(credentials.password)
    } catch (error) {
      expect(error.message).to.equal('Account locked. Check unlock instructions sent to you.')
    }
  })
})
