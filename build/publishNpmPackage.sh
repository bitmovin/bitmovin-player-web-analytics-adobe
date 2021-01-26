#!/bin/bash
set -e

# common variables
NPM_TAG=-1
VERSION=-1

if [[ "${CI_BRANCH}" =~ ^[0-9]+\.[0-9]+\.[0-9]+-?([a-z]*) ]]; then
    POSTFIX=${BASH_REMATCH[1]}
    VERSION=${CI_BRANCH}
    case ${POSTFIX} in
        "beta")
            NPM_TAG="beta"
            ;;
        "rc")
            NPM_TAG="staging"
            ;;
        "")
            NPM_TAG="latest"
            ;;
        *)
            echo "ERROR postfix ${POSTFIX} not supported"
            exit 1
            ;;
    esac
fi

# Checks if one version is greater than the other
# https://stackoverflow.com/a/24067243/370252
# Edge cases:
#  - if version_gt "1.3.2" "1.3.2" evaluates to false
#    so this can't be used to overwrite an existing version
#  - if version_gt "1.3.2" "1.3.2-0" evaluates to false
#    prerelease versions are considered greater than the final release,
#    but since we're splitting the versions into channels/tags that is not important right now
#    (as a workaround we could suffix "-zzzzz" to versions without a suffix)
function version_gt() { test "$(printf '%s\n' "$@" | sort -V | head -n 1)" != "$1"; }

## PUBLISH NPM PACKAGE

echo "NPM-TAG = ${NPM_TAG}"
if [[ ${NPM_TAG}  == -1 ]]; then
    echo "ERROR npm tag ${NPM_TAG} not valid"
    exit 1
fi

## Check if this version was already published.
## If something went wrong during a later build step and we re-run the release
## after fixing the problem, the npm publish would fail the build.
IS_PUBLISHED=$(npm view @bitmovin/player-integration-adobe@${VERSION} dist-tags || echo "")

if [[ "${IS_PUBLISHED}" != "" ]]; then
    echo "WARNING ${VERSION} is already published, skipping this step"
    exit 0
else
    echo "${VERSION} not published yet, doing it now"
fi

cd /bitmovin

echo "//registry.npmjs.org/:_authToken=${NPM_AUTH_TOKEN}" > ~/.npmrc
chmod 0600 ~/.npmrc

# The '|| echo null' ensures that in case of a failure of the previous commands we still get a
# proper value in the variable. This may happen
# a) if the package doesn't exist yet (i.e. this is the first release being published), or
# b) the tag doesn't exist yet (e.g. the first beta release but the package already exists).
# In such a case, $NPM_LATEST will have 'null' as value.
NPM_LATEST=$(npm view --json @bitmovin/player-integration-adobe dist-tags | jq -r ".${NPM_TAG}" || echo null)

echo "Latest version for tag '$NPM_TAG' on NPM: $NPM_LATEST"

# We always publish the package with the latest) tag because there is no way to publish a package without
# a tag (the default tag is always "latest"), and if the published version is older that the currently tagged version,
# we have to revert the tag afterwards to avoid version regressions.
echo "publishing ${VERSION} to NPM with "${NPM_TAG}" tag (current tagged version is ${NPM_LATEST})"
npm publish --tag ${NPM_TAG}

if [[ ${NPM_LATEST} == "null" ]]; then
  echo "New tag as no version was published with it before, nothing else to do here"
  exit 0
fi

if version_gt ${NPM_LATEST} ${VERSION}; then
    # The version we just published is lower than the previously tagged version on npm, so we need to revert the
    # tag to the previous version to avoid version downgrades (this e.g. avoids that a 1.2.5 hotfix release overwrites
    # the latest-tagged 1.3.2)
    echo "reverting "${NPM_TAG}" tag from the just published version ${VERSION} to the greater ${NPM_LATEST}"
    # it takes a while until the metadata after npm publish is updated so we need to wait to avoid a failed tag update
    # "npm WARN dist-tag add latest is already set to version ${VERSION}"
    sleep 10
    npm dist-tag add @bitmovin/player-integration-adobe@${NPM_LATEST} ${NPM_TAG}
fi
