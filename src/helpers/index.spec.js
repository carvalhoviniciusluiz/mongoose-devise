'use strict'

import { expect } from 'chai'
import { describe, it } from 'mocha'
import { Utils as ut } from '.'
import moment from 'moment'

describe('Utils helpers', () => {
  it('should add days', done => {
    const offset = 3

    const now = moment(new Date())
    const end = moment(ut.addDays(offset))

    const duration = moment.duration(end.diff(now))
    const days = duration.asDays()

    expect(parseInt(days)).to.be.equal(offset)
    done()
  })

  it('should return true if date before current or return false if date is not before current', done => {
    const end = moment.utc([2011, 0, 1, 8]).format()

    expect(ut.isAfter(new Date(), new Date())).to.be.false()
    expect(ut.isAfter(end, new Date())).to.be.true()
    done()
  })
})
