#!/bin/sh
set -e

docker build -t kmilo8346/pipelinr:latest -f ./apps/pipelinr/src/dockerfile .
docker build -t kmilo8346/commit-to-tasks:latest -f ./apps/commit-to-tasks/src/dockerfile .
docker build -t kmilo8346/pending-tasks-dispatcher:latest -f ./apps/pending-tasks-dispatcher/src/dockerfile .
docker build -t kmilo8346/control-plane:latest -f ./apps/control-plane/src/dockerfile .

docker push kmilo8346/pipelinr:latest
docker push kmilo8346/commit-to-tasks:latest
docker push kmilo8346/pending-tasks-dispatcher:latest
docker push kmilo8346/control-plane:latest