import moment from 'moment'
import { genToken } from './tokenizer'

export class Utils {
  static isFunction = (val) => typeof val === 'function'
  static isObject = (val) => typeof val === 'object'

  static genToken: Function = genToken

  static addDays = (offset: number, date?: Date): Date => {
    date = date || new Date()
    const momentAt: moment.Moment = moment(date).add(offset, 'days')
    return momentAt.toDate()
  }

  static isAfter = (first: Date, second: Date): boolean => {
    const firstMoment: moment.Moment = moment(first)
    const secondMoment: moment.Moment = moment(second)
    return secondMoment.isAfter(firstMoment)
  }

  static parseError = (error: Error): Error => {
    if ((<any>error).expected === 'object') {
      const e = error.message
      error.message = e.slice(0, e.indexOf('(object)')).trim()
    }
    return error
  }
}
