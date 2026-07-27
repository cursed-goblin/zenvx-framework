# Registry mirror format

`dev.containers` writes `registry-mirrors` into `etc/docker/daemon.json`. Bare
hostnames typed into the field are prefixed with the https scheme; values that
already carry a scheme are passed through untouched. The result must always be
a plain URL:

```json
{ "registry-mirrors": ["https://mirror.example.com"] }
```

The same list feeds `unqualified-search-registries` for Podman, where the
hostname is used without a scheme.
