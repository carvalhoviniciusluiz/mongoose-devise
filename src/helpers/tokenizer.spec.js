'use strict'

import { expect } from 'chai'
import { describe, it } from 'mocha'
import { genToken } from './tokenizer'

describe('Tokenizer helpers', () => {
  it('should encrypt or decrypt correctly', (done) => {
    const key = 'secret'
    const text = 'test'

    const encrypt = genToken(key).encrypt(text)
    const decrypt = genToken(key).decrypt(encrypt)

    expect(decrypt).to.be.equal(text)
    done()
  })
})
