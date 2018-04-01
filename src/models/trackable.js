'use strict'

export default function (schema) {
  // add trackable schema fields
  schema.add({
    signInCount: {
      type: Number,
      default: 0,
      index: true
    },
    currentSignInAt: {
      type: Date,
      default: null
    },
    currentSignInIpAddress: {
      type: String,
      index: true,
      default: null
    },
    lastSignInAt: {
      type: Date,
      default: null
    },
    lastSignInIpAddress: {
      type: String,
      index: true,
      default: null
    }
  })

  schema.methods.track = function (ipAddress, opts = { save: true }) {
    const self = this
    return new Promise(async (resolve, reject) => {
      try {
        // update signInCount
        self.signInCount = self.signInCount + 1

        // update previous sign in details
        self.lastSignInAt = self.currentSignInAt
        self.lastSignInIpAddress = self.currentSignInIpAddress

        // update current sign in details
        self.currentSignInAt = new Date()
        self.currentSignInIpAddress = ipAddress

        // save tracking details
        if (opts.save) {
          await self.save()
        }

        resolve(true)
      } catch (error) {
        reject(error)
      }
    })
  }
}
