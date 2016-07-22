#!/bin/bash

docker run -p 41901:5000 -d taesiri/raymond-coordinator
docker run -d taesiri/raymond-slave http://192.168.99.100:41901 1 3 5 1
docker run -d taesiri/raymond-slave http://192.168.99.100:41901 2 3 5 1
docker run -d taesiri/raymond-slave http://192.168.99.100:41901 3 3 5 1
