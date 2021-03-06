'use strict';

var Zermelo = require('../index.js');

Zermelo.prototype.logOn = function (userDetails, callback) {
  var self = this;

  if (this._loggedOn) {
    return callback('Already logged on; only one session allowed!');
  }

  var userInput = {};
  for (var input in userDetails) {
    if (Object.prototype.hasOwnProperty.call(userDetails, input)) {
      userInput[input.toLowerCase()] = userDetails[input];
    }
  }

  this.GetAuthCode(userInput, (err) => {
    if (err) {
      return callback(err);
    }
    self.call('debug', '[logOn] Successfully logged on!');
    return callback(null);
  });
};

Zermelo.prototype.GetAuthCode = function (userDetails, callback) {
  var self = this;

  if (!userDetails.school) {
    return callback('Missing school parameter!');
  } else if (typeof userDetails.secure !== 'undefined') {
    this._secure = (userDetails.secure === true);
  } else {
    self.call('debug', '[Zermelo] Secure parameter not supplied;  using default: true!');
    this._secure = true;
  }
  this._school = userDetails.school;

  if (userDetails.authcode) {
    self.call('debug', '[GetAuthCode1] Successfully got AuthCode: ' + userDetails.authcode);
    self.SetCode(userDetails.authcode.replace(/[^0-9]/g, ''), (err) => {
      if (err) {
        return callback(err);
      }
      return callback(null);
    });
  } else {
    if (!userDetails.username) {
      return callback('Missing username parameter!');
    } else if (!userDetails.password) {
      return callback('Missing password parameter!');
    } else {
      this._username = userDetails.username;
      this._password = userDetails.password;
    }

    var data = {
      'username': this._username,
      'password': this._password,
      'client_id': 'OAuthPage',
      'redirect_uri': '/main/----success----',
      'scope': '',
      'state': '',
      'response_type': 'code'
    };

    this.Post('oauth', data, function (err, res) {
      if (err) {
        return callback(err);
      }

      self.call('debug', '[GetAuthCode] Successfully got AuthCode: ' + res);
      self.SetCode(res, (err) => {
        if (err) {
          return callback(err);
        }
        return callback(null);
      });
    });
  }
};

Zermelo.prototype.SetCode = function (code, callback) {
  this._authCode = code;

  this.getToken((err) => {
    if (err) {
      return callback(err);
    }
    return callback(null);
  });
};

Zermelo.prototype.getToken = function (callback) {
  var self = this;

  if (!this._authCode) {
    return callback('Missing AuthCode!');
  }

  var data = {
    'grant_type': 'authorization_code',
    'code': this._authCode
  };

  this.Post('oauth/token', data, function (err, res) {
    if (err) {
      if (err === 400) {
        return callback('Invalid AuthCode Given!');
      }
      return callback(err);
    }

    self.call('debug', '[GetAuthCode] Successfully got token: ' + res.access_token);
    self.SetToken(res);
    return callback(null);
  });
};

Zermelo.prototype.SetToken = function (data) {
  this._token = data.access_token;
  this._expire = Date.now() + data.expires_in;
  this._loggedOn = true;
};
