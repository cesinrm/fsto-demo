/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , notifications = require('./routes/notifications')
  , dust = require('dustjs-linkedin')
  , helpers = require('dustjs-helpers')
  , cons = require('consolidate')
  , path = require('path')
  , nconf = require('nconf')
  , favicon = require('serve-favicon')
  , logger = require('morgan')
  , methodOverride = require('method-override')
  , session = require('express-session')
  , bodyParser = require('body-parser')
  , multer = require('multer')
  , errorHandler = require('errorhandler')
  , amqp = require('amqp')  
  ;

	var app = express();
	var env = app.get('env');
	
/**
 * Load hierarchical config
 */
	nconf.env().argv();
	if (env)
		nconf.file(env, './config/app-'+env+'.json');
	nconf.file('./config/app.json');
	
/**
 * Setting up express
 */
	var sessionConfig = nconf.get('config').session;

	// all environments
	app.set('port', process.env.PORT || nconf.get('port'));
	app.set('views', path.join(__dirname + '/views'));
	app.engine('dust', cons.dust);
	app.set('view engine', 'dust');
	//app.use(favicon(__dirname + '/public/favicon.ico'));
	app.use(methodOverride());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(multer());
	app.use(express.static(path.join(__dirname, 'public')));
	//app.use(session({ key: sessionConfig.key, store: new RedisStore(ropts), 
	//				secret: sessionConfig.secret, saveUninitialized: true, resave: true}));
	/*
	app.use(passport.initialize());
	app.use(passport.session());
	*/
	
    // development only
	if ('development' == env) {
	  app.use(errorHandler());
	}	

	// Routes
	app.get('/', routes.index);
	app.get('/notifications', notifications.get);
	app.delete('/notifications', notifications.delete);

	//Start the server
	
	var server = app.listen(app.get('port'), function(){
	  console.log('Header express server '+process.pid+' listening on port ' + app.get('port'));
	});
	
	var io = require('socket.io')(server);
	
	//Connect to the AMQP broker
	var mq;
	if (process.env.VCAP_SERVICES) {
	    var env = JSON.parse(process.env.VCAP_SERVICES);
	    var credentials = env['rabbitmq-2.8'][0].credentials;
	    mq = amqp.createConnection({ url: credentials.url });	    
	
	} else {
	   var amqpConfig = nconf.get('config').amqp;
	   mq = amqp.createConnection({ port: amqpConfig.port, host: amqpConfig.host});
	}	
	
	notifications.init(io, mq);