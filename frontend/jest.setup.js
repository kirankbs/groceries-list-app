// Pre-define globals that expo's winter runtime installs lazily.
// When the lazy getter fires outside a module scope (e.g., during Jest teardown),
// it throws "You are trying to import a file outside of the scope of the test code."
// Setting them eagerly prevents the lazy getter from ever triggering.

if (!global.__ExpoImportMetaRegistry) {
  global.__ExpoImportMetaRegistry = { url: null };
}

if (!global.structuredClone) {
  // Node 17+ has structuredClone natively; ensure it's present for older environments too.
  global.structuredClone = (val) => JSON.parse(JSON.stringify(val));
}
