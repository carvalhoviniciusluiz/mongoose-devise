'use strict'

import { expect } from 'chai'
import { describe, it } from 'mocha'
import { addDays, isAfter, parseError } from '.'
import moment from 'moment'

describe('Helpers', () => {
  it('should add days', (done) => {
    const offset = 3

    const now = moment(new Date())
    const end = moment(addDays(offset))

    const duration = moment.duration(end.diff(now))
    const days = duration.asDays()

    expect(parseInt(days)).to.be.equal(offset)
    done()
  })

  it('should return true if date before current or return ' +
    'false if date is not before current', (done) => {
    const end = moment.utc([2011, 0, 1, 8]).format()

    expect(isAfter(new Date(), new Date())).to.be.false()
    expect(isAfter(end, new Date())).to.be.true()
    done()
  })

  it('should remove (object) string', (done) => {
    let text = {
      expected: 'object',
      message: 'test (object)'
    }
    parseError(text)

    expect(text.message).to.be.equal('test')
    done()
  })
})
