server "192.168.1.128", :app, :web, :db, :primary => true
set :deploy_to, "/home/drink/drink_dev"

after "deploy", "develop:deps", "develop:stop", "develop:start"
