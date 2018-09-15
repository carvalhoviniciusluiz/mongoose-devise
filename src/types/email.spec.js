'use strict'

import './email'
import faker from 'faker'
import mongoose from 'mongoose'
import { expect } from 'chai'
import { describe, it } from 'mocha'

const Schema = mongoose.Schema
const Email = Schema.Types.Email

const testSchema = new mongoose.Schema({
  email: Email
})

const TestMail = mongoose.model('TestMail', testSchema)

describe('Email types', () => {
  it('should be invalid if the invalid email address', (done) => {
    var t = new TestMail()
    t.email = 'email@'

    t.validate((error) => {
      expect(error).to.be.not.null()
      done()
    })
  })

  it('should not be invalid if the valid email address', (done) => {
    var t = new TestMail()
    t.email = faker.internet.email().toLowerCase()

    t.validate((error) => {
      expect(error).to.be.null()
      done()
    })
  })
})
