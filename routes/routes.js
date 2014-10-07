var crypto = require('crypto');
var _ = require('underscore');
var nodemailer = require('nodemailer');
var fs = require('fs');
var auth = require(__dirname + '/../authConfig').auth;

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
  emails = req.body.emails;
  form = req.body.form;
  hashes = {};
  fs.readFile(__dirname + '/../email_templates/poll.html', 'utf8', function (err, template) {
    if (err) throw err;
    console.log(template);
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
      // setup e-mail data with unicode symbols
      var mailOptions = {
          from: 'Victor Hung <victormeetmail@gmail.com>', // sender address
          to: email, // list of receivers
          subject: 'Meet Mail!', // Subject line
          html: email_html // html body
      };

      // send mail with defined transport object
      transporter.sendMail(mailOptions, function(error, info){
          if(error){
              console.log(error);
          } else{
              console.log('Message sent: ' + info.response);
          }
      });
    });
    // Write hashes to firebase
    res.end();
  });
}
