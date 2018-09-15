'use strict'

import moment from 'moment'
import { genToken } from './tokenizer'

export class Utils {}

Utils.isFunction = (val) => typeof val === 'function'
Utils.isObject = (val) => typeof val === 'object'
Utils.genToken = genToken

Utils.addDays = (offset, date) => {
  date = date || new Date()
  const momentAt = moment(date).add(offset, 'days')
  return momentAt.toDate()
}

Utils.isAfter = (first, second) => {
  const firstMoment = moment(first)
  const secondMoment = moment(second)
  return secondMoment.isAfter(firstMoment)
}
