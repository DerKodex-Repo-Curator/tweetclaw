// SPDX-FileCopyrightText: 2026 Xquik Contributors
//
// SPDX-License-Identifier: MIT

import { assertApiPath, canonicalPath, findRoute } from './routes.js';
import type { FetchFunction, RequestFunction, RequestOptions } from './types.js';

const FETCH_TIMEOUT_MS = 30_000;
const CONTENT_TYPE_HEADER = 'content-type';
const API_KEY_HEADER = 'x-api-key';
const AUTHORIZATION_HEADER = 'authorization';
const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';
const BEARER_PREFIX = 'Bearer ';
const API_KEY_PREFIX = 'xq_';
const REDIRECT_STATUS_FIRST = 300;
const REDIRECT_STATUS_LAST = 399;
const MAX_SAFE_ERROR_CODE_LENGTH = 80;

function buildAuthHeader(credential: string): Record<string, string> {
  return credential.startsWith(API_KEY_PREFIX)
    ? { [API_KEY_HEADER]: credential }
    : { [AUTHORIZATION_HEADER]: `${BEARER_PREFIX}${credential}` };
}

function buildFetchHeaders(
  credential: string,
  hasBody: boolean,
  idempotencyKey?: string,
): Record<string, string> {
  const auth = credential === '' ? {} : buildAuthHeader(credential);
  const contentType = hasBody ? { [CONTENT_TYPE_HEADER]: 'application/json' } : {};
  const idempotency = idempotencyKey === undefined
    ? {}
    : { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey };
  return { ...auth, ...contentType, ...idempotency };
}

function createBaseUrl(baseUrl: string): URL {
  try {
    return new URL(baseUrl);
  } catch {
    throw new Error('Base URL is invalid. Enter an HTTPS URL.');
  }
}

function parseBaseUrl(baseUrl: string): URL {
  const url = createBaseUrl(baseUrl);
  if (url.protocol !== 'https:') {
    throw new Error('Base URL is not HTTPS. Use an HTTPS URL.');
  }
  if (url.username.length > 0 || url.password.length > 0) {
    throw new Error('Base URL contains credentials. Remove them.');
  }
  return url;
}

function buildFetchUrl(baseUrl: string, path: string, query?: Readonly<Record<string, string>>): string {
  const base = parseBaseUrl(baseUrl);
  const url = new URL(path, base);
  if (url.origin !== base.origin) {
    throw new Error('Path names another host. Use a catalog-listed API path.');
  }
  if (query !== undefined) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

// Path families an agent never reaches, whatever the generated catalog says.
// Key management, payments, account credentials, account settings and support
// stay in the dashboard. A family covers its own path and every path under it,
// for every method. A `readable` family still allows a GET of its own path.
// This list is written by hand on purpose, so no spec change can open a route.
const REFUSED_PATH_FAMILIES: ReadonlyArray<{ readonly path: string; readonly readable?: true }> = [
  { path: '/api/v1/account', readable: true },
  { path: '/api/v1/api-keys' },
  { path: '/api/v1/credits', readable: true },
  { path: '/api/v1/guest-wallets' },
  { path: '/api/v1/subscribe' },
  { path: '/api/v1/support' },
  { path: '/api/v1/x/account-connection-attempts' },
  { path: '/api/v1/x/account-connection-challenges' },
  { path: '/api/v1/x/accounts', readable: true },
];

function isStaticallyRefused(method: string, path: string): boolean {
  const target = canonicalPath(path);
  return REFUSED_PATH_FAMILIES.some((family) =>
    target === family.path
      ? !(family.readable === true && method.toUpperCase() === 'GET')
      : target.startsWith(`${family.path}/`));
}

// A request goes out only when it names an operation the catalog lists as
// agent-callable and the static list does not refuse. Every other request is
// refused, whatever the reason the catalog lacks it.
function assertCallableRequest(method: string, path: string): void {
  assertApiPath(path);
  const route = findRoute(method, path);
  if (isStaticallyRefused(method, path) || (route !== undefined && route.endpoint === undefined)) {
    throw new Error(
      'Endpoint is blocked for agents. Complete account, credential, billing, or support administration at dashboard.xquik.com.',
    );
  }
  if (route === undefined) {
    throw new Error(`Endpoint is not in the TweetClaw catalog. Choose a route returned by explore: ${method} ${path}`);
  }
}

function isProhibitedRequest(method: string, path: string): boolean {
  try {
    assertCallableRequest(method.toUpperCase(), path);
    return false;
  } catch {
    return true;
  }
}

async function readResponseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function isAsciiLetter(character: string): boolean {
  const lower = character.toLowerCase();
  return lower >= 'a' && lower <= 'z';
}

function isAsciiDigit(character: string): boolean {
  return character >= '0' && character <= '9';
}

function isSafeErrorCodeCharacter(character: string): boolean {
  return isAsciiLetter(character)
    || isAsciiDigit(character)
    || character === '_'
    || character === '.'
    || character === ':'
    || character === '-';
}

function isSafeErrorCode(value: string): boolean {
  if (
    value.length === 0
    || value.length > MAX_SAFE_ERROR_CODE_LENGTH
    || !isAsciiLetter(value.slice(0, 1))
  ) {
    return false;
  }
  for (const character of value) {
    if (!isSafeErrorCodeCharacter(character)) {
      return false;
    }
  }
  return true;
}

function stringErrorCode(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  if ('error' in value && typeof value.error === 'string') {
    return value.error;
  }
  return 'code' in value && typeof value.code === 'string' ? value.code : undefined;
}

function safeErrorCode(value: unknown): string | undefined {
  const code = stringErrorCode(value);
  return code !== undefined && isSafeErrorCode(code) ? code : undefined;
}

function formatApiError(response: Response, payload: unknown): string {
  const status = response.statusText.length > 0
    ? `${String(response.status)} ${response.statusText}`
    : String(response.status);
  const code = safeErrorCode(payload);
  return code === undefined ? `Xquik API returned ${status}.` : `Xquik API returned ${status} (${code}).`;
}

// A redirect could carry the credential to another address, so none is
// followed.
function assertNoRedirect(response: Response): void {
  if (response.status >= REDIRECT_STATUS_FIRST && response.status <= REDIRECT_STATUS_LAST) {
    throw new Error('Xquik API answered with a redirect. TweetClaw follows none, so the credential stays on this host.');
  }
}

function createProxiedRequest(
  baseUrl: string,
  credential: string,
  fetchFunction?: FetchFunction,
): RequestFunction {
  return async (path: string, options?: Readonly<RequestOptions>): Promise<unknown> => {
    const method = (options?.method ?? 'GET').toUpperCase();
    assertCallableRequest(method, path);
    const hasBody = options?.body !== undefined;
    const activeFetch = fetchFunction ?? globalThis.fetch;
    const response = await activeFetch(buildFetchUrl(baseUrl, canonicalPath(path), options?.query), {
      ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
      headers: buildFetchHeaders(credential, hasBody, options?.idempotencyKey),
      method,
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    assertNoRedirect(response);
    const json: unknown = await readResponseJson(response);
    if (!response.ok) {
      throw new Error(formatApiError(response, json));
    }
    return json;
  };
}

export {
  buildAuthHeader,
  buildFetchHeaders,
  buildFetchUrl,
  createProxiedRequest,
  IDEMPOTENCY_KEY_HEADER,
  isProhibitedRequest,
  isStaticallyRefused,
};
