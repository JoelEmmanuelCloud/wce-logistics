#!/bin/sh
set -eu
cat > /etc/seaweedfs/s3.json <<JSON
{
  "identities": [
    {
      "name": "app",
      "credentials": [{ "accessKey": "${STORAGE_ACCESS_KEY_ID}", "secretKey": "${STORAGE_SECRET_ACCESS_KEY}" }],
      "actions": ["Admin", "Read", "Write", "List", "Tagging"]
    }
  ]
}
JSON
exec weed server -dir=/data -ip.bind=0.0.0.0 -volume.max=100 -s3 -s3.port=8333 -s3.config=/etc/seaweedfs/s3.json
