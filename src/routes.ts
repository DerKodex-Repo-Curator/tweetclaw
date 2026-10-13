// SPDX-FileCopyrightText: 2026 Xquik Contributors
//
// SPDX-License-Identifier: MIT

import { API_SPEC, BLOCKED_OPERATIONS } from './api-spec.js';
import type { EndpointInfo } from './types.js';

interface Route {
  /** Present when an agent may call the operation. */
  readonly endpoint?: EndpointInfo;
  readonly method: string;
  readonly path: string;
}

const API_V1_PREFIX = '/api/v1/';
const PATH_VALUE_PREFIX = ':';
// Any HTTPS origin shows how a URL parser rewrites a path.
const PARSER_ORIGIN = 'https://tweetclaw.invalid';

/** Drops 1 trailing slash, so `/api/v1/account/` names `/api/v1/account`. */
function canonicalPath(path: string): string {
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

function pathSegments(path: string): readonly string[] {
  return canonicalPath(path).split('/');
}

function unescapeSegment(segment: string): string | undefined {
  try {
    return decodeURIComponent(segment);
  } catch {
    return undefined;
  }
}

// True when a path segment, once unescaped, holds a `.` or `..` part or cannot
// be unescaped at all.
function hasDotSegment(segment: string): boolean {
  const unescaped = unescapeSegment(segment);
  return unescaped === undefined
    || unescaped.split(/[/\\]/u).some((part) => part === '.' || part === '..');
}

// A path is plain when a URL parser sends it exactly as written and no segment
// holds a dot segment.
function isPlainPath(path: string): boolean {
  return new URL(path, PARSER_ORIGIN).pathname === path
    && !path.split('/').some((segment) => hasDotSegment(segment));
}

/**
 * Says why a path cannot name an operation. Returns undefined for a plain path
 * under /api/v1 without a query.
 */
function apiPathProblem(path: string): string | undefined {
  if (!path.startsWith(API_V1_PREFIX)) {
    return `Path is outside /api/v1/. Use a catalog-listed API path: ${path}`;
  }
  if (path.includes('?') || path.includes('#')) {
    return 'Pass query parameters through the query object, not in the path.';
  }
  return isPlainPath(path) ? undefined : 'Path is not sent as written. Use a plain catalog path.';
}

function matchesEndpointPath(endpointPath: string, requestPath: string): boolean {
  if (endpointPath === requestPath) return true;
  const endpointSegments = pathSegments(endpointPath);
  const requestSegments = pathSegments(requestPath);
  if (endpointSegments.length !== requestSegments.length) return false;

  return endpointSegments.every((segment, index) => {
    const requestSegment = String(requestSegments.at(index));
    return segment.startsWith(PATH_VALUE_PREFIX) ? requestSegment.length > 0 : segment === requestSegment;
  });
}

function pathValueCount(path: string): number {
  return pathSegments(path).filter((segment) => segment.startsWith(PATH_VALUE_PREFIX)).length;
}

function catalogRoute(endpoint: EndpointInfo): Route {
  const { method, path } = endpoint;
  return endpoint.agentProhibited === true ? { method, path } : { endpoint, method, path };
}

// Routes with fewer path values come first. A request for /x/tweets/search then
// finds the search route before /x/tweets/:id, which also fits it.
const ROUTES: readonly Route[] = [...API_SPEC.map((endpoint) => catalogRoute(endpoint)), ...BLOCKED_OPERATIONS]
  .toSorted((left, right) => pathValueCount(left.path) - pathValueCount(right.path));

/**
 * Finds the operation a request names, whether or not an agent may call it.
 * A path that is not a plain /api/v1 path names no operation.
 */
function findRoute(method: string, path: string): Route | undefined {
  return apiPathProblem(path) === undefined
    ? ROUTES.find((route) => route.method === method && matchesEndpointPath(route.path, path))
    : undefined;
}

export { apiPathProblem, canonicalPath, findRoute, matchesEndpointPath };
