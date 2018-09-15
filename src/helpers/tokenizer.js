'use strict'

import crypto from 'crypto'

export class Tokenizer {
  constructor (secret) {
    this.cipher = undefined
    this.decipher = undefined

    this.encrypt = function (text) {
      let crypted = this.cipher.update(text, 'utf8', 'hex')
      crypted += this.cipher.final('hex')
      return crypted
    }

    this.decrypt = function (text) {
      let dec = this.decipher.update(text, 'hex', 'utf8')
      dec += this.decipher.final('utf8')
      return dec
    }

    this.match = function (token, text) {
      return this.decrypt(token) === text
    }

    this.cipher = crypto.createCipher('aes-256-cbc', secret)
    this.decipher = crypto.createDecipher('aes-256-cbc', secret)
  }
}

export const genToken = (secret) => {
  return new Tokenizer(secret)
}
