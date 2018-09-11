declare module 'mongoose' {
  import mongoose = require('mongoose')
  interface Model<T extends Document> extends NodeJS.EventEmitter, ModelProperties {
    // authentibale
    authenticate (credentials: object, opts: object): Promise<mongoose.Model<T>|Error>
    // confirmable
    confirm (confirmationToken: string): Promise<mongoose.Model<T>|Error>
    // lockable
    unlock (unlockToken: string): Promise<mongoose.Model<T>|Error>
    // recoverable
    requestRecover (credentials: object, opts: object): Promise<mongoose.Model<T>|Error>
    recover (recoveryToken: string, newPassword: string): Promise<mongoose.Model<T>|Error>
    // registerable
    register (credentials: object, opts: object): Promise<mongoose.Model<T>|Error>
  }

  interface Document extends MongooseDocument, NodeJS.EventEmitter, ModelProperties {
    // authentibale
    validPassword (password: string): Promise<boolean|Error>
    authenticate (password: string, opts: object): Promise<boolean|Error>
    // confirmable
    confirmationToken: string,
    confirmationTokenExpiryAt: string,
    confirmedAt: string,
    confirmationSentAt: string,
    throwConfirmedError (): Error
    hasConfirmationTokenExpired (): boolean
    isConfirmed (): boolean
    generateConfirmationToken (): void
    sendConfirmation (opts: object): void
    confirm (): Promise<boolean|Error>
    // lockable
    failedAttempts: string,
    lockedAt: string,
    unlockedAt: string,
    unlockToken: string,
    unlockTokenSentAt: string,
    unlockTokenExpiryAt: string,
    throwLockedError (): Error
    hasUnlockTokenExpired (): boolean
    isLocked (): boolean
    generateUnlockToken (): void
    sendUnlock (opts: object): void
    lock (opts: object): Promise<boolean|Error>
    // recoverable
    recoveryToken: string,
    recoveryTokenExpiryAt: string,
    recoverySentAt: string,
    recoveredAt: string,
    generateRecoveryToken (): void
    sendRecovery (opts: object): void
    // registerable
    registeredAt: string,
    unregisteredAt: string,
    unregister (beforeUnregister?: Function, afterUnregister?: Function): Promise<boolean|Error>
    register (opts: object): Promise<boolean|Error>
    // trackable
    signInCount: string,
    currentSignInAt: string,
    currentSignInIpAddress: string,
    lastSignInAt: string,
    lastSignInIpAddress: string,
    track (ipAddress?: string): void
  }

  namespace Types {
    function Email (path: string, options: any): void
  }

  namespace Schema {
    namespace Types {
      function Email (path: string, options: any): void
    }
  }
}
