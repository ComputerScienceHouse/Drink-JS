server "purpledrank.csh.rit.edu", :app, :web, :db, :primary => true
set :deploy_to, "/home/drink/drink_dev"

after "deploy", "develop:deps", "develop:configs", "develop:stop", "develop:start"
