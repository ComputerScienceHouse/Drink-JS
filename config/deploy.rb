require 'capistrano'
require 'capistrano/cli'
require 'capistrano/ext/multistage'

set :application, "Drink-JS"

set :scm, :git
set :repository, "https://github.com/ComputerScienceHouse/Drink-JS.git"
set :scm_passphrase, ""
set :keep_releases, 5
set :force, false
set :scm_verbose, true
default_run_options[:pty] = true

set :branch, fetch(:branch, "master")

set :use_sudo, false
set :user, "drink"

set :stages, ["dev", "production"]
set :default_stage, "dev"

set :node_path, "/usr/bin/node"

ssh_options[:forward_agent] = true

namespace :deploy do
	task :postSetup, :roles => [:app] do
		run "sudo npm install --global forever"
	end
end

after "deploy:setup", "deploy:postSetup"


namespace :develop do
	task :deps, :roles => [:app] do
		desc "== running npm on #{latest_release} =="
		run "cd /home/drink/drink_server/current && rm -rf node_modules && npm install"
	end

	task :configs, :roles => [:app] do
		run "cp /home/drink/configs/mysql_config.js /home/drink/configs/ldap_config.js /home/drink/drink_server/current/config"
	end

	task :stop, :roles => [:app] do
		desc "======= Stopping drink dev site ======="
		run "forever stop server.js"
		run "forever stop websocket_server.js"
		run "forever stop redirect.js"
	end

	task :start, :roles => [:app] do
		desc "======= Starting splash site ======="
		run "export DRINK_ENV=dev; cd /home/drink/drink_server/current/lib && forever start server.js"
		run "cd /home/drink/drink_server/current/websocket_server && forever start websocket_server.js"
		run "cd /home/drink/drink_server/current/websocket_server && sudo nohup redirect.js"
	end
end

namespace :prod do
	task :deps, :roles => [:app] do
		desc "== running npm on #{latest_release} =="
		run "cd /home/drink/drink_server/current && rm -rf node_modules && npm install"
	end

	task :configs, :roles => [:app] do
		run "cp /home/drink/configs/mysql_config.js /home/drinkconfigs/ldap_config.js /home/drink/drink_server/current/config"
	end

	task :stop, :roles => [:app] do
		desc "======= Stopping drink dev site ======="
		run "forever stop server.js"
		run "forever stop websocket_server.js"
		run "forever stop redirect.js"
	end

	task :start, :roles => [:app] do
		desc "======= Starting splash site ======="
		run "export DRINK_ENV=dev; cd /home/drink/drink_production/current/lib && forever start server.js"
		run "cd /home/drink/drink_server/current/websocket_server && forever start websocket_server.js"
		run "cd /home/drink/drink_server/current/websocket_server && sudo nohup redirect.js"
	end
end

namespace :deploy do
	task :postSetup, :roles => [:app] do
		desc "Installing forever"
		run "sudo npm install --global forever"
	end
end
