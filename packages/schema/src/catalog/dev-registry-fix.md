# Registry mirror format

`dev.containers` writes `registry-mirrors` into `etc/docker/daemon.json`. The
values must be plain URLs:

```json
{ "registry-mirrors": ["https://mirror.example.com"] }
```

See `dev.ts` for the emit that produces them.
