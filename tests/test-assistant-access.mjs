import assert from 'node:assert/strict';
import { assistantKeyMatches } from '../convex/assistantAccess.ts';
const key='test-only-not-a-production-key-123456789';
assert.equal(await assistantKeyMatches(key,undefined),false);
assert.equal(await assistantKeyMatches(key,''),false);
assert.equal(await assistantKeyMatches('x'.repeat(40),key),false);
assert.equal(await assistantKeyMatches(key,key),true);
assert.equal(await assistantKeyMatches(key+'\r\nInjected: true',key),false);
console.log('PASS: assistant fails closed without configured server credential; unrelated sync keys denied.');
