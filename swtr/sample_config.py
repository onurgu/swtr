# secret key for the application used in session
secret_key = "a long random string; see python UUID"
# the URL pointing to the sweet store this application will sweet to
swtstoreURL = 'http://sweet/store/url'
# the app_id or client_id you have recieved when you registered this
# application to swtstore
app_id = 'the app_id or client_id'
# the app_secret or client_secret you have recieved when you registered this
# application to swtstore
app_secret = 'the app_secret or client_secret'
# the URL at which your application is hosted
# when you are deploying the app locally, by default this should be
#redirect_uri = 'http://localhost:5000'
redirect_uri = 'http://yourapplication.domain'
# The root URL of the application. This allows us to host the application
# in subdirectories of a hostname (optionally). Note that redirect_uri might be different
# thus we need a seperate one.
application_root_uri = 'http://yourapplication.domain/optionalsubdir'
