import crypto from 'crypto'

export class Tokenizer {
  protected cipher: crypto.Cipher = undefined
  protected decipher: crypto.Decipher = undefined

  constructor (secret: string) {
    this.cipher = crypto.createCipher('aes-256-cbc', secret)
    this.decipher = crypto.createDecipher('aes-256-cbc', secret)
  }

  encrypt = function (text: string): any {
    let crypted: any = this.cipher.update(text, 'utf8', 'hex')
    crypted += this.cipher.final('hex')
    return crypted
  }

  decrypt = function (text: string): any {
    let dec: any = this.decipher.update(text, 'hex', 'utf8')
    dec += this.decipher.final('utf8')
    return dec
  }

  match = function (token: string, text: string): boolean {
    return this.decrypt(token) === text
  }
}

export const genToken: ((secret: string) => Tokenizer) = (secret: string) => {
  return new Tokenizer(secret)
}
