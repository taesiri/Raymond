#!/bin/bash

docker run -p 41900:5000 -d taesiri/coordinator
docker run -d taesiri/slave http://192.168.99.100:41900 1 3 1 1
docker run -d taesiri/slave http://192.168.99.100:41900 2 3 1 1
docker run -d taesiri/slave http://192.168.99.100:41900 3 3 1 2
