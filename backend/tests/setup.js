// Load environment variables before any test runs.
// Unit tests mock axios so no real API calls are made, but the services
// read API keys eagerly — they must be present or getApiKey() throws.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
