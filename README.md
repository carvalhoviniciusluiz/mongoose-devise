# node-devise
Another flexible authentication solution for [mongoosejs](http://mongoosejs.com/). Inspired by [irina](https://github.com/lykmapipo/irina).

[![standard][standard-image]][standard-url]

[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg
[standard-url]: http://standardjs.com/

### Installation:
```sh
$ npm install node-devise --save
```

### Requires:
Node ``>8.0.0``.

Mongoose ``>5.0.0``.

### Summary

* [Usage](#usage)
* [Overview](#overview)
    * [Authenticable](#authenticable)
        * [encryptPassword](#encryptpasswordpassword-)
        * [comparePassword](#comparepasswordpassword-)
        * [changePassword](#changepasswordnewpassword-)
        * [authenticate](#authenticatepassword-)
        * [authenticate (static)](#authenticatecredentials-opts-)
    * [Confirmable](#confirmable)
        * [generateConfirmationToken](#generateconfirmationtokenopts---save-true--)
        * [sendConfirmation](#sendconfirmationopts---save-true--)
        * [isConfirmed](#isconfirmed-)
        * [confirm](#confirm-)
        * [confirm (static)](#confirmconfirmationtoken-)
    * [Lockable](#lockable)
        * [generateUnlockToken](#generateunlocktokenopts---save-true--)
        * [sendLock](#sendunlockopts---save-true--)
        * [isLocked](#islocked-)
        * [resetFailedAttempts](#resetfailedattempts-)
        * [lock](#lockopts-)
        * [unlock](#unlockunlocktoken-)
    * [Recoverable](#recoverable)
        * [generateRecoveryToken](#generaterecoverytokenopts---save-true--)
        * [sendRecovery](#sendrecoveryopts---save-true--)
        * [requestRecover](#requestrecovercredentials-opts-)
        * [recover](#recoverrecoverytoken-newpassword-)
    * [Registerable](#registerable)
        * [unregister](#unregister-)
        * [register](#registercredentials-opts-)
    * [Trackable](#trackable)
        * [track](#trackipaddress-)
* [Send Notifications](#sending-notifications)
  * [Record](#record-)
  * [Action](#action-)
  * [Done](#done-)
  * [How to implement a send](#how-to-implement-a-send)
  * [Sending issues](#sending-issues)
* [i18n](#i18n)

## Usage

Standard installation of the plugin:

```js
const mongoose = require('mongoose')
const devise = require('node-devise')

const UserSchema = new mongoose.Schema({})
UserSchema.plugin(devise)

mongoose.model('User', UserSchema)
```

#### Overview

## Authenticable

authenticatable Module, responsible for hashing the password and validating the authenticity of a user while signing in.

##### Options

authenticatable will set the following options to schema:

```
* +authenticationField+: parameter used to set the name of the authentication field

* +authenticationFieldType+: by default, `node-devise` will set the authentication field a Email type

* +passwordField+: parameter used to set the field that triggers the password hash

* +hashedPasswordField+: parameter used to set the name of the hashed field

* +maximumAllowedFailedAttempts+: number of attempts allowed before lockout of account. By default 3
```

##### Examples

```js
UserSchema.plugin(devise, {
  authenticationField: 'username',
  authenticationFieldType: String,
  maximumAllowedFailedAttempts: 5
})
```

##### Custom message options

Key | Description
------------ | -------------
authenticatorErrorMessage | parameter used to change the authentication error message
passwordErrorMessage | when the password is not entered
passwordNotMatchErrorMessage | used in the comparePassword method to inform that the password does not match
hashedPasswordErrorMessage | used in the comparePassword method to inform that the current instance does not have a password hash
authenticatorNotExistErrorMessage | used in the authenticate static method to inform that the string does not have a match in the database
credentialsNotExistErrorMessage | used in the authenticate static method to report that the credential is incorrect

#### Instance Methods

#### `#encryptPassword(password)` :

instance method used to encrypt the current password. This method is called when the
instance receives any value in the password field or when it makes a manual call.

##### Examples

```js
// encypt instance password
await user.encryptPassword('secret')
```
#### `#comparePassword(password)` :

an instance method which takes in a plain string password and compare with the instance hashed password to see if they match.

##### Examples

```js

// after having model instance, returns true or an exception
const res = await user.comparePassword('secret')
```

#### `#changePassword(newPassword)` :

an instance method that uses a single string in the newPassword parameter and sets
it to the current password of that authenticated instance.

##### Examples

```js

// after having model instance, returns true or an exception
const res = await user.changePassword('new_secret')
```

#### `#authenticate(password)` :

authenticates the user's instance from a password passed by parameter.

##### Examples

```js
// after having model instance, returns true or an exception
await user.authenticate(credentials.password)
```

#### Static Methods

#### `#authenticate(credentials, opts)` :

a static method which takes in credentials in the format below:

```js
const faker = require('faker')

const credentials = {
  email: faker.internet.email(),
  password: faker.internet.password()
}
```

where a valid `email` and `password` corresponding to a database user must be reported. At the end,
the user of the provided credentials will be returned, otherwise the corresponding errors will be thrown.

##### Examples

```js
// returns current object or an exception
const user = await User.authenticate(credentials)
```

internally the `authenticate static method` calls an `authenticate instance method` that can also be ivoked
by the instance object receiving in the parameter the current password.

## Confirmable

confirmable's main responsability is to verify if an account is already confirmed to sign in, and to send emails
with confirmation instructions. Confirmation instructions are sent to the user email after creating a record and when
manually requested by a new confirmation instruction request.

##### Confirmable adds the following columns:
- `confirmationToken` is a unique random token
- `confirmedAt` is a timestamp when the user clicked the confirmation link
- `confirmationSentAt` is a timestamp when the confirmationToken was generated (not sent)
- `confirmationTokenExpiryAt` is an attribute that keep tracks of when the confirmation token will expiry.
Beyond that, new confirmation token will be generated and notification will be send.

##### Examples

```js
const user = await User.findOne({ email: credentials.email })
try {
  await user.confirm()          // returns true or an exception
  await user.isConfirmed()      // returns true or an exception
  await user.sendConfirmation() // manually send instructions
} catch (error) {
  console.log(error.stack)
}
```

##### Options

confirmable will set the following options:

```
* +confirmable.tokenLifeSpan+: specifies the lifetime of the token, by default 3 days.
```

#### Custom message options

Key | Description
------------ | -------------
invalidConfirmationTokenErrorMessage | parameter used to tell that the commit token is invalid
confirmationTokenExpiredErrorMessage | informs you that the confirmation token has expired
accountNotConfirmedErrorMessage | when the account is not confirmed
checkConfirmationTokenExpiredErrorMessage | when the confirmation token has expired and a new email for verification is sent

#### Instance Methods

#### `#generateConfirmationToken(opts = { save: true })` :

an attribute that keep tracks of when the confirmation token will expiry.
Beyond that, new confirmation token will be generated and notification will be send.

##### Examples

```js
const res = await user.generateConfirmationToken({ save: false })

// when `save = false`
await res.save()
```

#### `#sendConfirmation(opts = { save: true })` :

This instance method is utilized by [model.send](#sending-notifications) and sends the confirmation notification. If sent successfully,
it will update confirmationSentAt instance attribute with the current time stamp and persist the instance before return it.

##### Examples

```js
// sends a confirmation notification and saves the send date in the `ConfirmationSentAt` parameter
const res = await user.sendConfirmation({ save: false })

// when `save = false`
await res.save()
```

#### `#isConfirmed()` :

verifies whether a user is confirmed or not.

##### Examples

```js
// after having model instance, returns true or an exception
const res = await user.isConfirmed()
```

#### `#confirm()` :

confirm a user by setting it's `confirmedAt` to actual time and persist the instance before return it.

##### Examples

```js
// after having model instance, returns true or an exception
const res = await user.confirm()
```

#### Static Methods

#### `#confirm(confirmationToken)` :

this static method takes the given confirmationToken and confirms un-confirmed registration which matches the given confirmation token.

##### Examples

```js
// returns current object or an exception
const res = await User.confirm('confirmationToken')
```

## Lockable

provide a means of locking an account after a specified number of failed sign-in attempts `(defaults to 3 attempts)`.
user can unlock account through unlock instructions sent. It extend the model with the following.

##### Lockable adds the following columns:
- `failedAttempt` is an attribute which keeps track of failed login attempts.
- `lockedAt` is an attribute which keeps track of the moment account is locked.
- `unlockedAt` is an attribute which keeps track of the moment  account is unlocked.
- `unlockToken` is an attribute which store the current unlock token of the locked account.
- `unlockTokenSentAt` is an attribute which keeps track of when the unlock token notification sent.
- `unlockTokenExpiryAt` is an attribute which keep track of `unlockToken` expiration. If `unlockToken`
is expired, a new token will get generated and set.

##### Examples

```js
const user = await User.findOne({ email: credentials.email })
try {
  // block account
  await user.lock()                     // returns true or an exception
  await user.isLocked()                 // returns true or an exception
  await user.sendUnlock()               // manually send instructions

  // unlocks account
  await User.unlock(user.unlockToken)   // returns current account or an exception
  await user.resetFailedAttempts()      // reset invalid login attempts
} catch (error) {
  console.log(error.stack)
}
```

##### Options

lockable will set the following options:

```
* +lockable.tokenLifeSpan+: specifies the lifetime of the token, by default 3 days.
```

#### Custom message options

Key | Description
------------ | -------------
accountLockedErrorMessage | parameter used to change the account lockout error message.
invalidUnlockTokenErrorMessage | informs that the unlock token is invalid.
unlockTokenExpiredErrorMessage | unlocking token already expired.

#### Instance Methods

#### `#generateUnlockToken(opts = { save: true })` :

an instance method that generate `unlockToken` and `unlockTokenExpiryAt`.
Instance will get persisted before returned otherwise corresponding errors will get returned.

##### Examples

```js
const res = await user.generateUnlockToken({ save: false })

// when `save = false`
await res.save()
```

#### `#sendUnlock(opts = { save: true })` :

an instance method which send account locked notification to the owner. It will set
`unlockTokenSentAt` to track when the lock notification is sent.
Instance will get updated before it returns otherwise corresponding errors will get returned.

##### Examples

```js
// sends a unlock notification and saves the send date in the `unlockTokenSentAt` parameter
const res = await user.sendUnlock({ save: false })

// when `save = false`
await res.save()
```

#### `#isLocked()` :

verifies whether a user is locked or not.

##### Examples

```js
// after having model instance, returns false if not locked or an exception
const res = await user.isLocked()
```

#### `#resetFailedAttempts()` :

clear previous failed attempts.

##### Examples

```js
// set failedAttempts = 0
const res = await user.resetFailedAttempts()
```

#### `#lock(opts)` :

an instance method that is used to lock an account. When invoked, it will check if the number of
`failedAttempts` is greater than the configured `maximum allowed login attempts`,
if so the account will get locked by setting `lockedAt` to the current timestamp of
`lock` invocation. Instance will get persisted before it returns otherwise corresponding errors will get returned.

##### Examples

```js
// after having model instance, returns true or an exception
const res = await user.lock()
```

#### Static Methods

#### `#unlock(unlockToken)` :

a model static method which unlock a locked account with the provided `unlockToken`.
If the token is expired the new `unlockToken` will get generated. If token is valid,
locked account will get unlocked and `unlockedAt` attribute will be set to current timestamp and
`failedAttempts` will get set to 0. Instance unlocked will get persisted before it
returns otherwise corrensponding errors will get returned.

##### Examples

```js
// returns current object or an exception
const res = await User.unlock('unlockToken')
```

## Recoverable

lays out infrastructure of resets of the user passwords and sends reset instructions.
It extends model with the following.

##### Recoverable adds the following columns:
- `recoveryToken` is an attribute that store recovery token.
- `recoveryTokenExpiryAt` is an attribute that track when the recoverable token is expiring.
- `recoverySentAt` is an attribute that keep track of the moment the recovery notification is sent.
- `recoveredAt` is an attribute which keeps track of the moment the password was recovered.

##### Examples

```js
try {
  // creates a new token and send it with instructions about how to reset the password
  const user = await User.requestRecover({ email: credentials.email })

  // resets the user password and save the record
  await User.recover(user.recoveryToken, 'new_secret')
} catch (error) {
  console.log(error.stack)
}
```

##### Options

recoverable will set the following options:

```
* +recoverable.tokenLifeSpan+: specifies the lifetime of the token, by default 3 days.
```

#### Custom message options

Key | Description
------------ | -------------
invalidRecoveryDetailsErrorMessage | parameter used to change the recovery details message is invalid.
invalidRecoveryTokenErrorMessage | informs message to invalid recovery token.
recoveryTokenExpiredErrorMessage | used to change expired recovery token message.

#### Instance Methods

#### `#generateRecoveryToken(opts = { save: true })` :

an instance method which is used to generate recoveryToken and set recoveryTokenExpiryAt timestamp.
Instance will get persisted before it returns.

##### Examples

```js
const res = await user.generateRecoveryToken({ save: false })

// when `save = false`
await res.save()
```

#### `#sendRecovery(opts = { save: true })` :

an instance method which is used to send recovery notification to the user. It will set recoveryTokenSentAt timestamp.
Instance will get persisted before it returns.

##### Examples

```js
const res = await user.sendRecovery({ save: false })

// when `save = false`
await res.save()
```

#### `#recover(recoveryToken, newPassword)` :

a model static method which is used to recover an account with the matched `recoverToken`.
The `newPassword` provided will get encrypted before set as user password. It will set `recoveredAt` before it persists the model.

##### Examples

```js
// returns current object or an exception
const res = await User.recover('recoveryToken', 'new_password')
```

#### Static Methods

#### `#requestRecover(credentials, opts)` :

a model static method which is used to request account password recovery. It utilize
`generateRecoveryToken` and `sendRecovery` to generate recovery token and send it.

##### Examples

```js
// returns current object or an exception
const res = await User.requestRecover({ email })
```

## Registerable

handles signing up users through a registration process, also allowing them to edit and destroy their account.

##### Registerable adds the following columns:
- `registeredAt` is an attribute which keeps track of when an account is registered.
- `unregisteredAt` is an attribute which keep tracks of when an account is unregistered.

##### Examples

```js
const faker = require('faker')
try {
  const user = await User.register({
    email: faker.internet.email().toLowerCase(),
    password: faker.internet.password()
  })
  const res = await user.unregister()
} catch (error) {
  console.log(error.stack)
}
```

##### Options

recoverable will set the following options:

```
* +registerable.autoConfirm+: allows registered accounts to be pre-confirmed.
```

#### Custom message options

Key | Description
------------ | -------------
credentialsNotExistErrorMessage | parameter used to change the bad credential message.
authenticatorAlreadyExistErrorMessage | change the message for existing accounts.

#### Instance Methods

#### `#unregister()` :

an instance method which allows unregistering (destroy a user). The implementation currently is to set `unregiesteredAt`
to current timestamp of the invocation. Instance will get persisted before is returned otherwise corresponding errors will be returned.

```js
// returns true or an exception
const res = await user.unregister()
```

#### Static Methods

#### `#register(credentials, opts)` :

a model static method which is used to register provided credentials. It takes care of checking if then email
is taken and validating credentials. It will return registered user otherwise corresponding registration errors.

```js
const faker = require('faker')

const credentials = {
  email: faker.internet.email(),
  password: faker.internet.password()
}

// returns current object or an exception
const user = await User.register(credentials)
```

## Trackable

provide a means of tracking user signin activities. It extends provided model with the following.

##### Trackable adds the following columns:
- `signInCount` increased every time a sign in is made (by form).
- `currentSignInAt` a timestamp updated when the user signs in.
- `currentSignInIpAddress` keeps track of the latest IP address a user used to log.
- `lastSignInAt` holds the timestamp of the previous sign in.
- `lastSignInIpAddress` holds the remote ip of the previous sign in.

##### Examples

```js
const user = await User.findOne({ email: credentials.email })

try {
  await user.track('ipAddress')
} catch (error) {
  console.log(error.stack)
}
```

#### Instance Methods

#### `track(ipAddress)` :

this is model instance method, which when called with the IP address, it will update current tracking
details and set the provided IP address as the `currentSignInIpAddress`.

##### Examples

```js
const faker = require('faker')
const user = await User.findOne({ email: faker.internet.email() })

// returns true or an exception
await user.track(faker.internet.ip())
```

## Sending Notifications

the default implementation of `node-devise` to send notifications is `noop`. This is because there are different use case(s) when it comes on sending notifications.

due to that reason, `node-devise` requires that your model implements `send method` which accept `record`, `action`, `done` as its argurments.

#### `record` :

refer to the current user model instance.

#### `action` :

refer to the type of notifcation to be sent. There are just three types which
are `account_confirmation`, `account_recovery` and `password_recovery` which are sent
when new account is registered, when an account is locked and need to be unlocked and when account is requesting
to recover the password respectively.

#### `done` :

is the callback that you must call after finishing sending the notification. By default this callback will update the notification send details based on the usage.

#### How to implement a send

simple add send into your model as instance methods.

##### Examples

```js
const UserSchema = new Schema({})

// override send method i.e your notification sending: email, sms, etc
schema.methods.send = function (record, action, done) {

  // below are the methods that dispatch the data to send via method `done`
  //
  // await User.requestRecover({ email }, { req })
  // await User.register({ email, password }, { req })
  // await User.unlock(req.user.unlockToken, { req })
  // await User.authenticate({ email, password }, { req })

  done((opts) => {
    // const host = isObject(opts) && (isObject(opts.req) && opts.req.isSecure())
    //   ? 'https'
    //   : 'http' + '://' + uri

    switch (action) {
      // if we send `confirmation email`
      case 'account_confirmation':
        console.log('Action type: %s.\nRecord: %s \n', action, JSON.stringify(record))
        break

      // if we send `account recovery`
      case 'password_recovery':
        console.log('Action type: %s.\nRecord: %s \n', action, JSON.stringify(record))
        break

      // if we send `account locked` information
      case 'account_recovery':
        console.log('Action type: %s.\nRecord: %s \n', action, JSON.stringify(record))
        break

      default:
        console.log('mailer', 'Template not found')
    }
  })
}
```

#### Sending issues

It is recommended to use job queue like [kue](https://github.com/Automattic/kue) when implementing your send to reduce your API response time.

## i18n

it is recommended to use an internalizer such as the [i18nex](https://www.i18next.com/) or [node-i18n](https://github.com/mashpie/i18n-node) when implementing the foreign language support layer.

the `node-devise` uses messages with the i18n. To customize your application, you can configure your locale file and use the i18n key in the installation plug-in:

```js
{
  'en-US': {
    // authenticable
    authenticatorErrorMessage: 'No {{field}} provided',
    passwordErrorMessage: 'No password provided',
    passwordNotMatchErrorMessage: 'Incorrect password',
    hashedPasswordErrorMessage: 'Hashed password not found',
    authenticatorNotExistErrorMessage: 'Incorrect {{field}}',
    credentialsNotExistErrorMessage: 'Incorrect credentials',

    // confirmable
    invalidConfirmationTokenErrorMessage: 'Invalid confirmation token',
    confirmationTokenExpiredErrorMessage: 'Confirmation token expired',
    accountNotConfirmedErrorMessage: 'Account not confirmed',
    checkConfirmationTokenExpiredErrorMessage: 'Confirmation token expired. Check your email for confirmation instructions.',

    // lockable
    accountLockedErrorMessage: 'Account locked. Check unlock instructions sent to you.',
    invalidUnlockTokenErrorMessage: 'Invalid unlock token',
    unlockTokenExpiredErrorMessage: 'Unlock token expired',

    // recoverable
    invalidRecoveryDetailsErrorMessage: 'Invalid recovery details',
    invalidRecoveryTokenErrorMessage: 'Invalid recovery token',
    recoveryTokenExpiredErrorMessage: 'Recovery token expired',

    // registerable
    authenticatorAlreadyExistErrorMessage: 'Account of {{field}} already exist'
  }
}
```

##### Examples

```js
UserSchema.plugin(devise, { i18n: i18n })
```

## Features & Roadmap
- [TODO] v0.1.0
- [DONE] Authenticatable
- ~~[DONE]~~ Omniauthable [[doc]](http://www.rubydoc.info/github/plataformatec/devise/master/Devise/Models/Omniauthable)
- [DONE] Confirmable
- [DONE] Recoverable
- [DONE] Registerable
- ~~[DONE]~~ Rememberable [[doc]](http://rubydoc.info/github/plataformatec/devise/master/Devise/Models/Rememberable)
- [DONE] Trackable
- ~~[DONE]~~ Timeoutable [[doc]](http://www.rubydoc.info/github/plataformatec/devise/master/Devise/Models/Timeoutable)
- ~~[DONE]~~ Validatable [[doc]](http://rubydoc.info/github/plataformatec/devise/master/Devise/Models/Validatable)
- [DONE] Lockable

### Test
* Install all development dependencies
```sh
$ npm install
```
* Then run test
```sh
$ npm test
```

### License

[MIT](http://opensource.org/licenses/MIT)

Copyright (c) 2018-present
