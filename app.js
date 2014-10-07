var express = require('express');
var http = require('http');
var path = require('path');
var bodyParser = require('body-parser');
var hbs = require('hbs');
var routes = require(__dirname + '/routes/routes');
var firebase = require('firebase');
var config = require(__dirname + '/authConfig').config;
var app = express();
var router = express.Router();

// VIEW ENGINE
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.engine('html', require('hbs').__express);
app.set('view options', {layout: false});

hbs.registerPartials(__dirname + '/views/partials');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// END VIEW ENGINE

app.get('/', routes.index);
app.get('/preview', function(req, res) {
  res.render('../email_templates/poll-pretty.html');
})

app.post('/mail', routes.mail);
app.post('/update', routes.update);
app.get('/admin/:form_id', routes.admin);

// Uncomment the next line to test the database
// app.get('/test-database', routes.testDatabase);

http.createServer(app).listen(config.port, function(){
  console.log('Express server listening on port ' + config.port);
});