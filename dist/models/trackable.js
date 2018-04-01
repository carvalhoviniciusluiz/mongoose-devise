'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (schema) {
  schema.add({
    signInCount: {
      type: Number,
      default: 0,
      index: true
    },
    currentSignInAt: {
      type: Date,
      default: null
    },
    currentSignInIpAddress: {
      type: String,
      index: true,
      default: null
    },
    lastSignInAt: {
      type: Date,
      default: null
    },
    lastSignInIpAddress: {
      type: String,
      index: true,
      default: null
    }
  });

  schema.methods.track = function (ipAddress, opts = { save: true }) {
    const self = this;
    return new Promise(async (resolve, reject) => {
      try {
        self.signInCount = self.signInCount + 1;

        self.lastSignInAt = self.currentSignInAt;
        self.lastSignInIpAddress = self.currentSignInIpAddress;

        self.currentSignInAt = new Date();
        self.currentSignInIpAddress = ipAddress;

        if (opts.save) {
          await self.save();
        }

        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  };
};