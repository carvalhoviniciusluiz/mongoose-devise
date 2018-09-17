import mongoose from 'mongoose'
import { networkInterfaces } from 'os'

declare module 'mongoose' {
  interface Document extends MongooseDocument, NodeJS.EventEmitter, ModelProperties {
    signInCount: string,
    currentSignInAt: string,
    currentSignInIpAddress: string,
    lastSignInAt: string,
    lastSignInIpAddress: string,
    track (ipAddress?: string): void
  }
}

function externalIpAddress () {
  try {
    return [].concat(...Object.values(networkInterfaces()))
      .filter(details => details.family === 'IPv4' && !details.internal)
      .pop().address
  } catch (_e) {
    return ''
  }
}

export function trackable (schema: mongoose.Schema): void {
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

  schema.methods.track = async function (ipAddress?: string) {
    const self: any = this
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
