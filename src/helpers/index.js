'use strict'

import { genToken } from './tokenizer'
import { addDays, isAfter } from 'date-fns'

export class Utils {}

Utils.isFunction = (val) => typeof val === 'function'
Utils.isObject = (val) => typeof val === 'object'
Utils.genToken = genToken

Utils.addDays = (offset, date) => {
  date = date || new Date()
  return addDays(date, offset)
}

Utils.isAfter = (first, second) => {
  return isAfter(second, first)
}
