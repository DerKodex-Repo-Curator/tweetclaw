// SPDX-FileCopyrightText: 2026 Xquik Contributors
//
// SPDX-License-Identifier: MIT

// Loads the endpoint catalog that scripts/generate-api-contract.mjs builds from
// the Xquik OpenAPI spec. Nothing here is written by hand. To change the
// catalog, run `npm run generate-api-contract`.

import GENERATED_API_CONTRACT from '../generated-api-contract.json' with { type: 'json' };
import type { EndpointInfo, EndpointParameter } from './types.js';

interface OperationKey {
  readonly method: string;
  readonly path: string;
}

interface StoredParameter extends Omit<EndpointParameter, 'in'> {
  readonly in: string;
}

// Each operation names its parameters and its response shape by their position
// in the 2 lists that all operations share.
interface StoredOperation extends Omit<EndpointInfo, 'mpp' | 'parameters' | 'responseShape'> {
  readonly mppPrice?: string;
  readonly parameters: readonly number[];
  readonly responseShape: number;
}

interface StoredContract {
  readonly approvalFreeReads: readonly string[];
  readonly blockedOperations: readonly OperationKey[];
  readonly operations: readonly StoredOperation[];
  readonly parameters: readonly StoredParameter[];
  readonly responseShapes: readonly string[];
}

interface ApiContract {
  /** Free reads, as "GET /api/v1/path", that run without an approval prompt. */
  readonly approvalFreeReads: ReadonlySet<string>;
  /** Operations under /api/v1 that the catalog leaves out. */
  readonly blockedOperations: readonly OperationKey[];
  readonly endpoints: readonly EndpointInfo[];
}

const PARAMETER_LOCATIONS = ['body', 'header', 'path', 'query'] as const;

function parameterLocation(value: string): EndpointParameter['in'] {
  const location = PARAMETER_LOCATIONS.find((candidate) => candidate === value);
  if (location === undefined) throw new Error(`Invalid parameter location: ${value}`);
  return location;
}

function storedValue<T>(values: readonly T[], position: number, operation: OperationKey): T {
  const value = values.at(position);
  if (value === undefined) {
    throw new Error(`Missing generated contract for ${operation.method} ${operation.path}`);
  }
  return value;
}

function mppInfo(price: string | undefined): Pick<EndpointInfo, 'mpp'> {
  return price === undefined ? {} : { mpp: { intent: 'charge', price } };
}

function loadApiContract(contract: StoredContract): ApiContract {
  const parameters = contract.parameters.map(
    (parameter): EndpointParameter => ({ ...parameter, in: parameterLocation(parameter.in) }),
  );
  const endpoints = contract.operations.map((operation): EndpointInfo => {
    const { mppPrice, parameters: positions, responseShape, ...described } = operation;
    return {
      ...described,
      ...mppInfo(mppPrice),
      parameters: positions.map((position) => storedValue(parameters, position, operation)),
      responseShape: storedValue(contract.responseShapes, responseShape, operation),
    };
  });
  return {
    approvalFreeReads: new Set(contract.approvalFreeReads),
    blockedOperations: contract.blockedOperations,
    endpoints,
  };
}

const {
  approvalFreeReads: APPROVAL_FREE_READS,
  blockedOperations: BLOCKED_OPERATIONS,
  endpoints: API_SPEC,
} = loadApiContract(GENERATED_API_CONTRACT);

export { API_SPEC, APPROVAL_FREE_READS, BLOCKED_OPERATIONS, loadApiContract };
export type { StoredContract };
