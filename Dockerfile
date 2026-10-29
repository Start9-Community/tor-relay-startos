# Version pins. Bump by hand as described in UPDATING.md.
FROM alpine:3.23

ARG TOR_VERSION=0.4.9.15-r0
ARG LYREBIRD_VERSION=0.7.0-r6

RUN apk add --no-cache \
      "tor=${TOR_VERSION}" \
      "lyrebird=${LYREBIRD_VERSION}" \
      busybox-extras \
 && test -x /usr/bin/lyrebird \
 && tor --version

COPY www/ /www/
RUN ln -s /data/status.json /www/status.json \
 && ln -s /data/history.json /www/history.json
