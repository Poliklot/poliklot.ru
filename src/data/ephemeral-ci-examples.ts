// Project-specific Android excerpts. The runnable generic controller lives in examples/ephemeral-ci.
export const ciExamples = {
	androidChecks: `set -euo pipefail

npm run lint
npm run test:config
npm test -- --ci --runInBand

cd android
./gradlew :app:dependencies \\
  --configuration devReleaseRuntimeClasspath --no-daemon`,
	androidBuild: `set -euo pipefail

# После получения DEV-ключа
./gradlew :app:bundleDevRelease --no-daemon`,
	relay: `ServerAliveInterval 15
ServerAliveCountMax 3`,
} as const;
