'use strict'

import moment from 'moment'
export { genToken } from './tokenizer'
export { isFunction, isObject } from 'lodash'

export const addDays = (offset, date) => {
  date = date || new Date()
  const momentAt = moment(date).add(offset, 'days')
  return momentAt.toDate()
}

export const isAfter = (first, second) => {
  const firstMoment = moment(first)
  const secondMoment = moment(second)
  return secondMoment.isAfter(firstMoment)
}

export const parseError = (error) => {
  if (error.expected === 'object') {
    const e = error.message
    error.message = e.slice(0, e.indexOf('(object)')).trim()
  }
}
