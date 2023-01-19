# Start from a debian-based recent LTS node version
FROM node:16-slim

# Install required tools and dependencies
RUN apt-get update && \
    apt-get install -qqy --no-install-recommends \
      # jq ... (commandline JSON processor) to parse JSON results in Shell scripts
      jq

# Set the WORKDIR to /bitmovin so all following commands run in /bitmovin
WORKDIR /bitmovin

# COPY the package.json and if you use npm shrinkwrap the npm-shrinkwrap.json and
# install npm dependencies before copying the whole codebase into the image.
COPY package.json ./
COPY package-lock.json ./
RUN npm ci

# After installing dependencies copy the whole codebase into the Container to not invalidate the cache before
COPY . ./
# custom player builds are atm. executed on jenkins in a docker container which does not run as UID 0 so we need to change this
# has no direct impact on exposed files, the directory is still inside the build container
RUN chmod -R 777 /bitmovin