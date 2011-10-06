#! /usr/bin/env ruby

# Tini hardware spoofing script
# Alex Crawford (abcrawf) - Oct. 2011
#
# Note: Only tested with Ruby 1.9.2
#
# This script implements the full Tini-Drink spec. Drops randomly fail
# based on the DROP_ACK_ODDS percentage. The status of the slots changes
# randomly with a 50/50 distribution. The script periodically sends a new
# temperature and periodically sends a noop.


require 'socket'
require 'timeout'

OPCODE_SERVER_LOGIN       = '0'
OPCODE_SERVER_DROP_ACK    = '4'
OPCODE_SERVER_DROP_NACK   = '5'
OPCODE_SERVER_SLOT_STATUS = '7'
OPCODE_SERVER_TEMPERATURE = '8'
OPCODE_SERVER_NOOP        = '9'

OPCODE_TINI_ERROR         = '-1'
OPCODE_TINI_LOGIN_ACK     = '1'
OPCODE_TINI_LOGIN_NACK    = '2'
OPCODE_TINI_DROP          = '3'
OPCODE_TINI_SLOT_STATUS   = '6'

READLINE_TIMEOUT          = 5
DROP_ACK_ODDS             = 0.2
SEND_TEMP_INTERVAL        = 50
SEND_NOOP_INTERVAL        = 40
SERVER_PASSWORD           = 'herpin_my_derp'


unless (ARGV.size == 2)
	puts "Usage: #{__FILE__} server port"
	exit
end

server = ARGV[0].to_s
port   = ARGV[1].to_i

puts "Connecting to '#{server}' on '#{port}'"


begin
	socket = TCPSocket.new(server, port)
rescue SocketError => e
	puts e
	exit
rescue Errno::ETIMEDOUT => e
	puts e
	puts "Retrying..."
	retry
end

puts "Connected to drink server"

puts "Logging in..."
socket.send("#{OPCODE_SERVER_LOGIN} #{SERVER_PASSWORD}\n", 0)

line = socket.readline.strip
case line
	when OPCODE_TINI_ERROR
		puts "Error - Couldn't log into server (wrong password?)"
		exit
	when OPCODE_TINI_LOGIN_ACK
		puts "Successfully logged into server!"
	when OPCODE_TINI_LOGIN_NACK
		puts "Login Nack - Couldn't log into server (invalid ip address?)"
		exit
	else
		puts "Unexpected response (#{line.dump})"
		exit
end


puts "\nPress any key to quit\n\n"

t_temp = Thread.new do
	temp = 0.0
	while true
		puts "Sending temperature"
		socket.send("#{OPCODE_SERVER_TEMPERATURE} #{temp}\n", 0)
		temp += 0.5
		sleep(SEND_TEMP_INTERVAL)
	end
end

t_noop = Thread.new do
	while true
		puts "Sending noop"
		socket.send("#{OPCODE_SERVER_NOOP}\n", 0)
		sleep(SEND_NOOP_INTERVAL)
	end
end

t_process = Thread.new do
	msg = ''
	while true
		begin
			Timeout::timeout(READLINE_TIMEOUT) do
				msg = socket.readline
			end
		rescue Timeout::Error
			next
		end

		opcode  = msg[0]
		payload = msg[1..-1].strip

		puts "Received #{msg.dump}"

		case opcode
			when OPCODE_TINI_DROP
				slot = payload.to_i
				puts "Dropping from slot #{slot}"
				if (Random.new.rand > DROP_ACK_ODDS)
					puts "Sending drop ack"
					socket.send("#{OPCODE_SERVER_DROP_ACK}\n", 0)
				else
					puts "Sending drop nack"
					socket.send("#{OPCODE_SERVER_DROP_NACK}\n", 0)
				end
			when OPCODE_TINI_SLOT_STATUS
				slot = payload.to_i
				status = (Random.new.rand + 0.5).to_i
				puts "Requested slot #{slot} status"
				puts "Sending status (#{status}) for slot (#{slot})"
				socket.send("#{OPCODE_SERVER_SLOT_STATUS} #{slot} #{status}\n", 0)
		end
	end
end



STDIN.gets

t_temp.exit
t_noop.exit
t_process.exit
