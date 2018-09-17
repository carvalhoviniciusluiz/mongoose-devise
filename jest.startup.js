const mongoose = require('mongoose')

const beforeAllTests = () => {
  return mongoose.connect('mongodb://localhost:27017/devise-test', {
    useNewUrlParser: true
  })
}

const afterAllTests = () => {
  mongoose.connection.dropDatabase()
  mongoose.disconnect()
}

beforeAllTests()
  .then(() => require('jest-cli').run())
  .then(() => afterAllTests())
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
