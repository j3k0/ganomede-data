# ganomede-data

Expose public data.

## Configuration

Environment variables:

* `HOST` — interface to listen on (`'127.0.0.1'`);
* `PORT` — port to listen on (`'127.0.0.1'`);
* `API_SECRET` — non-empty string for authorizing non-read operations;
* `REDIS_HOST` — hostname of Redis instance to store documents in;
* `REDIS_PORT` — port of Redis instance to store documents in.

## API

### Create document `/data/v1/docs/ [POST]`

Body

``` js
{ "secret": "API_SECRET",
  "document": {/*…*/}      // JSON to insert.
}
```

Response `[200 OK]`
Response `[403 Forbidden]` — invalid secret.

``` js
{ "id": "idString" }  // ID of created document.
```

### Read document `/data/v1/docs/:id [GET]`

Response `[200 OK]`

``` js
{ /*…*/ }  // Document itself as created (without id).
```

Response `[404 Not Found]` — document with specified `:id` was not found.

### Replace document `/data/v1/docs/:id [POST]`

Response `[200 OK]` — document replaced.
Response `[404 Not Found]` — document with specified `:id` was not found.
Response `[403 Forbidden]` — invalid secret.

### Delete document `/data/v1/docs/:id [DELETE]`

Response `[200 OK]` — document deleted or does not exist.
Response `[403 Forbidden]` — invalid secret.
