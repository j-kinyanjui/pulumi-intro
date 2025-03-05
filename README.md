# pulumi-intro


## prerequisites

- [devbox](https://jetify-com.vercel.app/docs/devbox/installing_devbox/)

All other dependencies are managed in the [devbox.json](devbox.json) file and will be available in the local shell.

## How to get up and running

> [!NOTE]   
> The first time you run devbox shell may take a while to complete due to Devbox downloading prerequisites and package catalogs required by Nix. 
> This delay is a one-time cost, and future invocations and package additions should resolve much faster.

```shell
devbox shell
```

Once you have a devbox shell:

```shell
pulumi up
```

## cleanup up

```shell
pulumi destroy
```