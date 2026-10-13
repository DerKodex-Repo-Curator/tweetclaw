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

const PATH_VALUE_PREFIX = ':';

function pathSegments(path: string): readonly string[] {
  const normalized = path.endsWith('/') ? path.slice(0, -1) : path;
  return normalized.split('/');
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

/** Finds the operation a request names, whether or not an agent may call it. */
function findRoute(method: string, path: string): Route | undefined {
  return ROUTES.find((route) => route.method === method && matchesEndpointPath(route.path, path));
}

export { findRoute, matchesEndpointPath };
