# App verification — 16 November 2026

- Android debug APK: built successfully; minimum Android 8.0 (API 26), target API 37.
- APK signing: verified with Android SDK apksigner (debug signer, APK Signature Scheme v2).
- Android lint: 0 errors. Two informational warnings remain for the deliberately pinned Gradle version and the base adaptive icon (an Android 13+ monochrome variant is included separately).
- Native unit tests: 4 passed for HTTPS origin isolation, hostile URL rejection, supported external schemes and configuration validation.
- Receipt integration: browser check passed; the existing srcdoc invoice iframe is captured by the native print hook.
- Existing website: production build passed; all 344 regression tests passed.
- Android phone/emulator: no device connected and no emulator configured; camera, file uploads/downloads, printing and app lifecycle need physical-device validation.
- iPhone: Swift sources, shared configuration, XcodeGen project specification, permission descriptions and opaque app icon prepared. Not compiled, signed or device-tested on this Windows machine.
- Neither app has been published to a store. No release signing identity has been configured.
