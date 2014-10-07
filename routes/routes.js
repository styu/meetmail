var crypto = require('crypto');
var _ = require('underscore');
var nodemailer = require('nodemailer');
var fs = require('fs');
var auth = require(__dirname + '/../authConfig').auth;
var config = require(__dirname + '/../authConfig').config;
var Firebase = require('firebase');
var Q = require('q');

var DEBUG = false;

// create reusable transporter object using SMTP transport
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: auth.user,
        pass: auth.password
    }
});

exports.index = function(req, res) {
  res.render('index.html', {text: "Hello World"});
}

exports.mail = function(req, res) {
  var ref = new Firebase("https://poofytoo.firebaseio.com/meetmail");
  // TODO: not currently a secure connection
  // TODO: this would need a transaction
  ref.once('value', function(val) {
    var data = val.val();
    var formId = val.val().formcounter;
    ref.child('formcounter').set(formId + 1);

    var formData = {};
    formData.id = formId;
    formData.name = req.body.form;
    formData.users = {};

    emails = req.body.emails;
    form = req.body.form;
    hashes = {};
    fs.readFile(__dirname + '/../email_templates/poll.html', 'utf8', function (err, template) {
      if (err) throw err;
      var userCounter = 0;
      _.each(emails, function (email, idx) {
        var shasum = crypto.createHash('sha1');
        shasum.update(email + form);
        hash = shasum.digest('hex');
        hashes[hash] = {
          email: email,
          form: form
        };
        email_html = template.replace('{email_action}', config.url + '/update')
        email_html = email_html.replace('{email_token}', hash);
        email_html = email_html.replace('{email_id}', formId);
        // setup e-mail data with unicode symbols
        var mailOptions = {
            from: 'Victor Hung <victormeetmail@gmail.com>', // sender address
            to: email, // list of receivers
            subject: '[Next Haunt] Next Meeting for Next Haunt', // Subject line
            html: email_html // html body
        };

        // send mail with defined transport object
        if (!DEBUG) {
          transporter.sendMail(mailOptions, function(error, info){
              if(error){
                  console.log(error);
              } else{
                  console.log('Message sent: ' + info.response);
              }
          });
        }
        formData.users[userCounter] = { 
          email: email, 
          token: hash
        };
        userCounter ++;
      });

      // Update Firebase
      ref.child('form').child(formId).set(formData);
      res.end();
    });
  });
}

exports.update = function(req, res) {
  // find firebase child based on req.body.token
  var token = req.body.token || "8e1fc2ce1f64f0b243db73922d5111e799a9ba88";
  var formId = req.body.email_id || 5;

  ref = new Firebase("https://poofytoo.firebaseio.com/meetmail");
  ref.once('value', function(s) {
      data = s.val();
      usersList = data.form[formId].users;
      for (user in usersList) {
        if (usersList[user].token == token) {
          console.log(usersList[user].email + " just submitted a response!");
          response = _.omit(req.body, ['token', 'email_id']);
          ref.child('form').child(formId).child('users').child(user).child('responses').set(response);
          res.render('submit.html', {email: usersList[user].email});
        };
      }
  });
}

function getUserResponse (promises, formId, user, options) {
  var deferred = Q.defer();
  ref.child('form').child(formId).child('users').child(user).once('value', function(user) {
    var userData = user.val();
    var keys = _.keys(options);
    var vals = _.map(keys, function(val) { return false; });
    var user_options = {};
    _.each(keys, function(key, idx) { user_options[key] = vals[idx]; });
    if (userData.responses) {
      _.each(userData.responses, function(response, idx) {
        user_options[response] = true;
      });
    }
    deferred.resolve({
      email: userData.email,
      responses: user_options
    });
  });
  promises.push(deferred.promise);
  return promises;
}

exports.admin = function(req, res) {
  var formId = req.params.form_id;
  var options = {
    'opt1': {
      'day': 'Wednesday, Oct 8',
      'time': '8pm - 9pm'
    },
    'opt2': {
      'day': 'Wednesday, Oct 8',
      'time': '9pm - 10pm'
    },
    'opt3': {
      'day': 'Wednesday, Oct 8',
      'time': '10pm - 11pm'
    },
    'opt4': {
      'day': 'Wednesday, Oct 8',
      'time': '11pm - 12am'
    },
    'opt5': {
      'day': 'Thursday, Oct 9',
      'time': '8pm - 9pm'
    },
    'opt6': {
      'day': 'Thursday, Oct 9',
      'time': '9pm - 10pm'
    },
    'opt7': {
      'day': 'Thursday, Oct 9',
      'time': '10pm - 11pm'
    },
    'opt8': {
      'day': 'Thursday, Oct 9',
      'time': '11pm - 12am'
    }
  };
  var users = [];
  ref = new Firebase("https://poofytoo.firebaseio.com/meetmail");
  ref.child('form').child(formId).once('value', function(form) {
    data = form.val();
    usersList = data.users;
    var promises = [];
    for (user in usersList) {
      promises = getUserResponse(promises, formId, user, options);
    }
    Q.all(promises).then(function(results) {
      res.render('admin.html', {options: options, users: results});
    });
  });
}
