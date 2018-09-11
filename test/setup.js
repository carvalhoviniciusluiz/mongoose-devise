'use strict'

import mongoose from 'mongoose'
import chai from 'chai'
import chaiHttp from 'chai-http'
import dirtyChai from 'dirty-chai'
import { before, after } from 'mocha'

chai.use(chaiHttp)
chai.use(dirtyChai)

// prepares a clean bank
before(() => {
  const options = {
    useNewUrlParser: true
  }
  mongoose.connect('mongodb://localhost/devise', options, (err) => {
    if (err) {
      throw err
    }
  })
})

after(() => {
  mongoose.connection.dropDatabase()
})
