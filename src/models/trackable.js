'use strict'

import { networkInterfaces } from 'os'

function externalIpAddress () {
  try {
    return [].concat(...Object.values(networkInterfaces()))
      .filter(details => details.family === 'IPv4' && !details.internal)
      .pop().address
  } catch (_e) {
    return ''
  }
}

export function trackable (schema) {
  // add trackable schema fields
  schema.add({
    signInCount: {
      type: Number,
      default: 0,
      index: true
    },
    currentSignInAt: {
      type: Date,
      default: null,
      index: true
    },
    currentSignInIpAddress: {
      type: String,
      default: null,
      index: true
    },
    lastSignInAt: {
      type: Date,
      default: null,
      index: true
    },
    lastSignInIpAddress: {
      type: String,
      default: null,
      index: true
    }
  })

  schema.methods.track = async function (ipAddress) {
    const self = this

    // update signInCount
    self.signInCount = self.signInCount + 1

    // update previous sign in details
    self.lastSignInAt = self.currentSignInAt
    self.lastSignInIpAddress = self.currentSignInIpAddress

    // update current sign in details
    self.currentSignInAt = new Date()
    self.currentSignInIpAddress = ipAddress || await externalIpAddress()

    // save tracking details
    await self.save()
  }
}
