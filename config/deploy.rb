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

set :stages, ["production"]
set :default_stage, "production"

set :node_path, "/usr/bin/node"

ssh_options[:forward_agent] = true

namespace :deploy do
	task :postSetup, :roles => [:app] do
		run "sudo npm install --global forever"
	end
end

after "deploy:setup", "deploy:postSetup"

=begin
namespace :photoGallery do
	task :deps, :roles => [:app] do
		desc "== running npm on #{latest_release} =="
		run "cd ~/www/photo_gallery_staging/current/photo_gallery && rm -rf node_modules && npm install"
		run "cd ~/www/photo_gallery_staging/current/queue_workers && rm -rf node_modules && npm install"
	end

	task :globalDeps, :roles => [:app] do
		run "sudo npm install --global forever"
	end

	task :stop, :roles => [:app] do
		desc "======= Stopping splash site ======="
		run "forever stop server.js"
		run "forever stop photo_processor.js"
	end

	task :start, :roles => [:app] do
		desc "======= Starting splash site ======="
		run "cd ~/www/photo_gallery_staging/current/photo_gallery && forever start server.js"
		run "cd ~/www/photo_gallery_staging/current/queue_workers/lib && forever start photo_processor.js"
	end

	task :createUploadedDir, :role => [:app] do 
		run "mkdir ~/uploaded_photos"
	end
end

namespace :splashSite do
	task :deps, :roles => [:app] do 
		run "cd #{latest_release}/splash_site && rm -rf node_modules && npm install"
	end

	task :stop, :roles => [:app] do
		desc "======= Stopping splash site ======="
		run "forever stop splash_server.js"
	end

	task :start, :roles => [:app] do
		desc "======= Starting splash site ======="
		run "cd #{latest_release}/splash_site && forever start splash_server.js"
	end
end

after "deploy:setup", "photoGallery:createUploadedDir"
=end
