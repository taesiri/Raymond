#!/bin/bash

docker run -p 41907:5000 -d taesiri/raymond-coordinator
docker run -d taesiri/raymond-slave http://192.168.99.100:41907 1 7 1 1
docker run -d taesiri/raymond-slave http://192.168.99.100:41907 2 7 1 1
docker run -d taesiri/raymond-slave http://192.168.99.100:41907 3 7 1 1
docker run -d taesiri/raymond-slave http://192.168.99.100:41907 4 7 1 2
docker run -d taesiri/raymond-slave http://192.168.99.100:41907 5 7 1 2
docker run -d taesiri/raymond-slave http://192.168.99.100:41907 6 7 1 3
docker run -d taesiri/raymond-slave http://192.168.99.100:41907 7 7 1 3

