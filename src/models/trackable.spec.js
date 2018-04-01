'use strict'

import faker from 'faker'
import { before, describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import devise from '..'

const Schema = mongoose.Schema
const email = faker.internet.email().toLowerCase()
const previousIp = faker.internet.ip()
const currentIp = faker.internet.ip()

describe('Trackable: models', () => {
  before((done) => {
    const TrackableSchema = new Schema({})
    TrackableSchema.plugin(devise)
    mongoose.model('Trackable', TrackableSchema)

    done()
  })

  it('should have trackable fields', (done) => {
    const Trackable = mongoose.model('Trackable')

    expect(Trackable.schema.paths).to.have.property('signInCount')
    expect(Trackable.schema.paths).to.have.property('currentSignInAt')
    expect(Trackable.schema.paths).to.have.property('currentSignInIpAddress')
    expect(Trackable.schema.paths).to.have.property('lastSignInAt')
    expect(Trackable.schema.paths).to.have.property('lastSignInIpAddress')

    done()
  })

  it('should be able to set trackable details', async () => {
    const Trackable = mongoose.model('Trackable')
    const trackable = new Trackable({
      email,
      password: faker.internet.password()
    })
    expect(trackable.track).to.exist()
    expect(trackable).to.respondTo('track')

    await trackable.track(previousIp)

    expect(trackable.currentSignInAt).to.not.be.null()
    expect(trackable.currentSignInIpAddress).to.not.be.null()
    expect(trackable.currentSignInIpAddress).to.equal(previousIp)
  })

  it('should be able to update tracking details', async () => {
    const Trackable = mongoose.model('Trackable')
    const trackable = await Trackable.findOne({ email })
    const lastSignInAt = trackable.currentSignInAt

    expect(trackable.signInCount).to.equal(1)
    expect(trackable.currentSignInAt).to.not.be.null()
    expect(trackable.currentSignInIpAddress).to.not.be.null()
    expect(trackable.currentSignInIpAddress).to.equal(previousIp)

    await trackable.track(currentIp)

    expect(trackable.signInCount).to.equal(2)
    expect(trackable.lastSignInAt).to.not.be.null()
    expect(trackable.lastSignInAt).to.eql(lastSignInAt)
    expect(trackable.lastSignInIpAddress).to.not.be.null()
    expect(trackable.lastSignInIpAddress).to.equal(previousIp)
    expect(trackable.currentSignInAt).to.not.be.null()
    expect(trackable.currentSignInIpAddress).to.not.be.null()
    expect(trackable.currentSignInIpAddress).to.equal(currentIp)
  })
})
