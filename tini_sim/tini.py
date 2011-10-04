from socket import *
import sys

if __name__ == '__main__':
	# need n command line arguments: drink server IP, drink server port tini
	if len(sys.argv) != 3:
		print "Usage: python tini.py <drink server IP> <drink server port>"
		exit()

	host = sys.argv[1]
	port = int(sys.argv[2])
	buf = 1024

	addr = (host, port)

	sock = socket(AF_INET, SOCK_STREAM)

	sock.connect(addr)

	sock.send("0");
	sock.send("password");
	sock.send("\n");

	data = sock.recv(buf)

	print(data)

	

