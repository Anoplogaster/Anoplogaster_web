#!/usr/bin/env bash
# Exact official source, patched embedded Go; no system install or binary fallback.
set -euo pipefail

readonly hugo_release='v0.168.0'
readonly go_release='go1.27.3'
readonly source_commit='e27a6760c5547237f87d353aebe0580feadb20f4'
readonly source_sum='h1:66W8JvXbGhxhAktj3ycv6kLyDIvQkwaoAl/6yRfI09w='
readonly module_sum='h1:iaJdmjHjjFb19UwtO2CvHDWOl5hkWwX+s8Vp6lSHZks='

for tool in go node cc c++; do
  command -v "$tool" >/dev/null || { echo "Required build tool missing: $tool" >&2; exit 1; }
done
export GOENV=off GOAUTH=off GOTOOLCHAIN=local GOWORK=off CGO_ENABLED=1
export GOFLAGS='' GOEXPERIMENT='' CC=cc CXX=c++
unset GOOS GOARCH CGO_CFLAGS CGO_CPPFLAGS CGO_CXXFLAGS CGO_LDFLAGS
export GOPROXY='https://proxy.golang.org' GOSUMDB='sum.golang.org'
export GOPRIVATE='' GONOSUMDB='' GONOPROXY=''
[[ "$(go env GOVERSION)" == "$go_release" ]] || {
  echo "Hugo source build requires the reviewed Go 1.27.3 toolchain." >&2
  exit 1
}

readonly requested_cache="${1:-node_modules/.cache/hugo-source}"
mkdir -p "$requested_cache"
build_cache="$(cd "$requested_cache" && pwd -P)"
readonly build_cache
export GOBIN="$build_cache/bin" GOMODCACHE="$build_cache/modules" GOCACHE="$build_cache/go-build"
# SumDB's trusted latest checkpoint lives under GOPATH, not GOMODCACHE.
export GOPATH="$build_cache/gopath"
mkdir -p "$GOBIN" "$GOMODCACHE" "$GOCACHE" "$GOPATH"
go mod download -json "github.com/gohugoio/hugo@$hugo_release" > "$build_cache/source.json"
node - "$build_cache/source.json" "$hugo_release" "$source_sum" "$module_sum" "$source_commit" <<'NODE'
const fs = require('node:fs');
const [file, version, sum, goModSum, commit] = process.argv.slice(2);
const source = JSON.parse(fs.readFileSync(file, 'utf8'));
if (source.Error || source.Path !== 'github.com/gohugoio/hugo' || source.Version !== version ||
    source.Sum !== sum || source.GoModSum !== goModSum ||
    (source.Origin?.Hash && source.Origin.Hash !== commit)) {
  throw new Error('Official Hugo source identity/checksum verification failed');
}
NODE

# Version-qualified installation ignores the website's go.mod. Rebuild or reuse
# Go's content-addressed compilation cache, never an unchecked downloaded binary.
go install -p 2 -trimpath -tags extended "github.com/gohugoio/hugo@$hugo_release" >&2
readonly hugo_binary="$GOBIN/hugo"
"$hugo_binary" version > "$build_cache/hugo-version.txt"
go version -m "$hugo_binary" > "$build_cache/go-build-info.txt"
cc --version > "$build_cache/c-compiler.txt"
c++ --version > "$build_cache/cxx-compiler.txt"
node - "$build_cache" "$hugo_release" "$go_release" "$source_sum" "$source_commit" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const [directory, release, runtime, sourceSum, commit] = process.argv.slice(2);
const read = name => fs.readFileSync(path.join(directory, name), 'utf8').trim();
const version = read('hugo-version.txt');
const info = read('go-build-info.txt');
if (!version.startsWith(`hugo ${release}`) || !version.includes('+extended') ||
    info.split('\n')[0].split(/\s+/).at(-1) !== runtime ||
    !info.includes(`github.com/gohugoio/hugo\t${release}\t${sourceSum}`) ||
    !info.includes('CGO_ENABLED=1') || !info.includes('-tags=extended')) {
  throw new Error('Built Hugo version, edition, source or embedded-Go verification failed');
}
const evidence = {
  hugoVersion: version, embeddedGo: runtime, officialSourceCommit: commit,
  sourceModuleSum: sourceSum, buildTags: ['extended'], cgoEnabled: true,
  sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, 'bin/hugo'))).digest('hex'),
  cCompiler: read('c-compiler.txt').split('\n')[0],
  cxxCompiler: read('cxx-compiler.txt').split('\n')[0]
};
fs.writeFileSync(path.join(directory, 'provenance.json'), JSON.stringify(evidence, null, 2) + '\n');
console.error(`Verified ${version}; embedded ${runtime}; SHA-256 ${evidence.sha256}`);
NODE

# stdout is deliberately only the verified absolute executable path.
printf '%s\n' "$hugo_binary"
