# mongoose-devise
Another flexible authentication solution for [mongoosejs](http://mongoosejs.com/).

[![standard][standard-image]][standard-url]
[![travis][travis-image]][travis-url]
[![Code Coverage][coverage-image]][coverage-url]
[![npm][npm-image]][npm-url]

[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg
[standard-url]: http://standardjs.com/
[travis-image]: https://travis-ci.org/carvalhoviniciusluiz/mongoose-devise.svg?branch=master
[travis-url]: https://travis-ci.org/carvalhoviniciusluiz/mongoose-devise
[coverage-image]: https://scrutinizer-ci.com/g/carvalhoviniciusluiz/mongoose-devise/badges/quality-score.png?b=master
[coverage-url]: https://scrutinizer-ci.com/g/carvalhoviniciusluiz/mongoose-devise/?branch=master
[npm-image]: https://img.shields.io/npm/v/mongoose-devise.svg?style=flat
[npm-url]: https://npmjs.org/package/mongoose-devise

### Requires:
Node ``>8.0.0``.

Mongoose ``>5.0.0``.

## Usage

Standard installation of the plugin:

```js
const mongoose = require('mongoose')
const devise = require('mongoose-devise')
// or
// const { devise } = require('mongoose-devise')

const UserSchema = new mongoose.Schema({})
UserSchema.plugin(devise)

mongoose.model('User', UserSchema)
```

__IMPORTANT__
* only the most common methods are documented. For more information check the tests
* in all cases, the `opts` parameter will be used to pass some configuration to the `sendNotification` method.

## Registerable

module that allows you to register an access account or, disable a registered account.

#### `#register(credentials, opts)` :

a static method used to register credentials. It will return the registered user or the corresponding errors of the registration attempt.

```js
const faker = require('faker')

User.register({
  email: faker.internet.email(),
  password: faker.internet.password()
})
.then(user)
.catch(error)
```

#### `#unregister(beforeUnregister, afterUnregister)` :

an instance method that lets you unregister (destroy a user). It receives two callbacks the parameter, one that executes before and the other after the save the object.

```js
user.unregister(
  function () {
    // something before..
  },
  function () {
    // something later
  }
)
// #=> true
```

__NOTE__ The implementation currently assigns the value of `unregisteredAt` to the current date.

## Confirmable

__TIP__ identifiable by the flag `account_confirmation`.

module that verifies whether an account has already been confirmed or conveys instructions for confirmation.

#### `#confirm(confirmationToken)` :

this static method receives a valid `validationToken` string to be able to confirm the unconfirmed record. Returns a user or the errors.

```js
User.confirm('confirmation-token-valid')
  .then(user)
  .catch(error)
```

#### `#confirm()` :

instance method that confirms the account registration. Returns a boolean or errors in the process.

##### Examples

```js
user.confirm()
  .then(isConfirmed)
  .catch(error)
```

#### `#isConfirmed()` :

verifies whether a user is confirmed or not.

##### Examples

```js
user.isConfirmed()
// #=> true
```

## Authenticable

authenticatable module, responsible for hashing the password and validating the authenticity of a user while signing in.


#### `#authenticate(password, opts)` :

authenticates the user's instance from a password passed by parameter. If no errors are processed, a boolean will be returned.

##### Examples

```js
user.authenticate('secret')
  .then(isAuthenticated)
  .catch(error)
```

#### `#authenticate(credentials, opts)` :

a static method which takes in credentials in the format:

```js
const faker = require('faker')

const credentials = {
  email: faker.internet.email(),
  password: faker.internet.password()
}
```

where a valid `email` and `password` corresponding to a database user must be reported. At the end,
the user of the provided credentials will be returned, otherwise the corresponding errors.

##### Examples

```js
User.authenticate(credentials)
  .then(user)
  .catch(error)
```

#### `#validPassword(password)` :

an instance method which takes in a plain string password and compare with the instance hashed password to see if they match.

##### Examples

```js
user.validPassword('secret')
// #=> true
```

## Recoverable

__TIP__ identifiable by the flag `password_recovery`.

module that establishes user password reset and sends resetting instructions.

#### `#recover(recoveryToken, newPassword)` :

a static method used to retrieve an account bound to a `recoverToken` string. It receives two parameters, the first is the token and the second the new recovery password. Returns the linked user or any errors that occur.

##### Examples

```js
User.recover('recovery-token-valid', 'new-password')
  .then(user)
  .catch(error)
```

#### `#requestRecover(credentials, opts)` :

a model static method which is used to request account password recovery. Returns the user or any errors that occur.

##### Examples

```js
User.requestRecover({ email })
  .then(user)
  .catch(error)
```

## Lockable

__TIP__ identifiable by the flag `account_recovery`.

provide a means of locking an account after a specified number of failed sign-in attempts `(defaults to 3 attempts)`.

__NOTE__ user can unlock account via unlock instructions issued.

#### `#lock(opts)` :

an instance method that is used to lock an account. When invoked, it will check if the number of
`failedAttempts` is greater than the configured `maximum allowed login attempts`,
if so the account will get locked by setting `lockedAt` to the current timestamp.

##### Examples

```js
user.lock()
  .then(isLocked)
  .catch(error)
```

#### `#isLocked()` :

verifies whether a user is locked or not.

##### Examples

```js
user.isLocked()
// #=> true
```

#### `#unlock(unlockToken)` :

a static method that unlocks a locked account with the provided `unlockToken` string.

* If the token expires, the new `unlockToken` will be generated.
* If the token is valid, the locked account will be unlocked and the `unlockedAt` attribute will be set to the current date and time.
`failedAttempts` will be set to 0.

##### Examples

```js
User.unlock('unlock-token-valid')
  .then(user)
  .catch(error)
```

## Trackable
provide a means of tracking user signin activities.

#### `track(ipAddress)` :
this is the instance method that will update the tracking details. Optionally receives a valid ip string.

```js
user.track()
```

## Sending Notifications

the default implementation of `mongoose-devise` to send notifications is simple. This is because there are different use case(s) when it comes on sending notifications.

due to that reason, `mongoose-devise` requires that your model implements `sendNotification method` which accept `record`, `action`, `done` as its argurments.

#### `record` :

refer to the current user model instance.

#### `action` :

refer to the type of notifcation to be sent. There are just three types which
are `account_confirmation`, `account_recovery` and `password_recovery` which are sent
when new account is registered, when an account is locked and need to be unlocked and when account is requesting
to recover the password respectively.

#### `done` :

is the callback that you must call after finishing sending the notification. By default this callback will update the notification send details based on the usage.

* all the methods that accept the `opts` parameter, pass this parameter to the callback `done`

##### Examples

```js
const UserSchema = new Schema({})

// override send method i.e your notification sending: email, sms, etc
schema.methods.sendNotification = function (record, action, done) {
  done(opts => {
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

It is recommended to use job queue like [kue](https://github.com/Automattic/kue) or [bull](https://github.com/OptimalBits/bull) when implementing your send to reduce your API response time.

### Custom messages

`mongoose-devise` uses messages to customize your application, you can configure the message definition variables manually

It is recommended to use an internalizer such as [i18nex](https://www.i18next.com/) or [node-i18n](https://github.com/mashpie/i18n-node) when implementing the support layer to the language.

```js
// custom to pt-BR, default is en-US.
userSchema.plugin(devise, {
  authenticationFieldMessage: 'Endereço de email inválido',
  // authenticable
  authenticatorError: 'O {{field}} não foi informada',
  passwordError: 'Senha não informada',
  authenticatorNotExistError: 'Esse email não existe',
  credentialsNotExistError: 'Credênciais incorretas',

  // confirmable
  invalidConfirmationTokenError: 'Token de confirmação inválido',
  confirmationTokenExpiredError: 'Token de confirmação expirou',
  accountNotConfirmedError: 'Conta não confirmada',

  // registerable
  definitionsNotFoundError: 'Dados básicos não encontrados',

  // lockable
  accountLockedError: 'Conta bloqueada. Verifique as instruções de desbloqueio enviadas para o seu email',
  invalidUnlockTokenError: 'Token de desbloqueio inválido',
  unlockTokenExpiredError: 'Token de desbloqueio expirado',

  // recoverable
  accountWithoutAssociationError: 'Não existe conta associada a esse email',
  invalidRecoveryTokenError: 'Token de recuperação recusado',
  recoveryTokenExpiredError: 'Token de recuperação expirado'
})
```

> See complete MVC solution based on Restify engines;

> [Restify Devise](https://github.com/carvalhoviniciusluiz/restify-devise)

### Thanks

Inspired by [irina](https://github.com/lykmapipo/irina).

### Test
* Install all development dependencies
```sh
npm install
```
* Then run test
```sh
npm test
```

### License

[MIT](http://opensource.org/licenses/MIT)

Copyright (c) 2018-present
