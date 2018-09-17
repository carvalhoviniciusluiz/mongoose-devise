export class DeviseError extends Error {
  public code

  constructor(message?: string) {
      super(message)
      this.name = 'DeviseError'
      this.stack = (<any> new Error()).stack

      // Set the prototype explicitly.
      Object.setPrototypeOf(this, DeviseError.prototype)
  }
}