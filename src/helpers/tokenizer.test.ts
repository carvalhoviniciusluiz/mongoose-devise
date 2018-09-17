import 'jest'

import { genToken } from './tokenizer'

describe('Tokenizer helpers', () => {
  it('should encrypt or decrypt correctly', (done) => {
    const key = 'secret'
    const text = 'test'

    const encrypt = genToken(key).encrypt(text)
    const decrypt = genToken(key).decrypt(encrypt)

    expect(decrypt).toEqual(text)
    done()
  })
})
