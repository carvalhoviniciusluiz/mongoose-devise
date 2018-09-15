'use strict'

export class DeviseError extends Error {
  constructor (message) {
    super(message)
    this.name = 'DeviseError'
    this.stack = new Error().stack

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, DeviseError.prototype)
  }
}
