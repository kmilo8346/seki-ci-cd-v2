# Testing all together

## Run many useful commands

### Secrets: Secrets generation

```sh
#/bin/sh
source ./utils.sh
cd ..
cd ..
npx nx run-many --target=secrets --all
```

### Build: build all the project inside a product

```sh
#/bin/sh
source ./utils.sh
cd ..
cd ..
npx nx run-many --target=build --all
```

## Lift the docker compose

The core docker compose has the following stack of containers:

- [Redis](https://redis.io/): the main database for Pipelinr

```sh
#/bin/sh
source ./utils.sh

cd ..
cd ..

WORKSPACE=$PWD
sh ./docs/dev/newtabi.sh "cd $WORKSPACE && docker-compose -f ./.seki/.local/compose.yaml up"
exit 0;
```

## Lift all projects

Execute all projects opening all project via tab in **iTerm**:

```sh
#/bin/sh
cd ..
cd ..

WORKSPACE=$PWD

sh ./docs/dev/newtabi.sh "cd $WORKSPACE && npx nx run pipelinr:serve"
sh ./docs/dev/newtabi.sh "cd $WORKSPACE && npx nx run commit-to-tasks:serve"
sh ./docs/dev/newtabi.sh "cd $WORKSPACE && npx nx run control-plane:serve"
sh ./docs/dev/newtabi.sh "cd $WORKSPACE && npx nx run pending-tasks-dispatcher:serve"

exit 0;
```
