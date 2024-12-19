## Build
Execute the following command to build the code.
```
pnpm clean
pnpm install  or  pnpm install --no-frozen-lockfile
pnpm build
```

## Configuration

To get a TEE simulator for local testing, use the following commands:
```shell
docker pull phalanetwork/tappd-simulator:latest
# by default the simulator is available in localhost:8090
docker run --rm -p 8090:8090 phalanetwork/tappd-simulator:latest
```

When using the provider through the runtime environment, ensure the following settings are configured:
```shell

 # Optional, for simulator purposes if testing on mac or windows. Leave empty for Linux x86 machines.
DSTACK_SIMULATOR_ENDPOINT="http://host.docker.internal:8090"
VLOG="true"
```

## Test 

Test files are located in the `test` folder. To run the tests, execute the following command:

```shell
pnpm test

```
