server "purpledrank.csh.rit.edu", :app, :web, :db, :primary => true
set :deploy_to, "/home/drink/drink_server"
set :branch, 'master'

after "deploy", "production:deps", "production:configs", "production:stop", "production:start"
