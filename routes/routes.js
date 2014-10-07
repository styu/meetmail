var crypto = require('crypto');
var _ = require('underscore');
var nodemailer = require('nodemailer');
var fs = require('fs');
var auth = require(__dirname + '/../authConfig').auth;
var Firebase = require('firebase');

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
    formData.name = form;
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
        email_html = template.replace('{email_action}', 'http://localhost:3000/update')
        email_html = email_html.replace('{email_token}', hash);
        email_html = email_html.replace('{email_id}', formId);
        // setup e-mail data with unicode symbols
        var mailOptions = {
            from: 'Victor Hung <victormeetmail@gmail.com>', // sender address
            to: email, // list of receivers
            subject: 'Meet Mail!', // Subject line
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
  new Firebase("https://poofytoo.firebaseio.com/meetmail")
    .equalTo(null, req.body.token)
    .once('value', function(snap) {
       console.log('accounts matching email address', snap.val())
    });
  res.end();
}
