#!/bin/bash

docker run -p 41909:5000 -d taesiri/raymond-coordinator
docker run -d taesiri/raymond-slave http://192.168.99.100:41909 1 9 1 1
docker run -d taesiri/raymond-slave http://192.168.99.100:41909 2 9 1 1
docker run -d taesiri/raymond-slave http://192.168.99.100:41909 3 9 1 1
docker run -d taesiri/raymond-slave http://192.168.99.100:41909 4 9 1 2
docker run -d taesiri/raymond-slave http://192.168.99.100:41909 5 9 1 2
docker run -d taesiri/raymond-slave http://192.168.99.100:41909 6 9 1 3
docker run -d taesiri/raymond-slave http://192.168.99.100:41909 7 9 1 3
docker run -d taesiri/raymond-slave http://192.168.99.100:41909 8 9 1 4
docker run -d taesiri/raymond-slave http://192.168.99.100:41909 9 9 1 4
