#!/bin/bash

docker run -p 41905:5000 -d taesiri/raymond-coordinator
docker run -d taesiri/raymond-slave http://192.168.99.100:41905 1 5 1 1
docker run -d taesiri/raymond-slave http://192.168.99.100:41905 2 5 1 1
docker run -d taesiri/raymond-slave http://192.168.99.100:41905 3 5 1 1
docker run -d taesiri/raymond-slave http://192.168.99.100:41905 4 5 1 2
docker run -d taesiri/raymond-slave http://192.168.99.100:41905 5 5 1 3