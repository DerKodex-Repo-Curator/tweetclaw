// SPDX-FileCopyrightText: 2026 Xquik Contributors
//
// SPDX-License-Identifier: MIT

import type { AnyAgentTool } from 'openclaw/plugin-sdk/plugin-entry';

interface EndpointParameter {
  readonly description: string;
  readonly in: 'body' | 'header' | 'path' | 'query';
  readonly name: string;
  readonly required: boolean;
  readonly type: string;
}

interface EndpointInfo {
  readonly agentProhibited?: boolean;
  readonly category: string;
  readonly free: boolean;
  readonly method: string;
  readonly mpp?: { readonly intent: 'charge'; readonly price: string };
  readonly parameters: readonly EndpointParameter[];
  readonly path: string;
  readonly responseShape: string;
  readonly sensitive?: boolean;
  readonly summary: string;
}

/** What an MPP route charges for 1 call, in the token's smallest unit. */
interface MppOffer {
  readonly amount: string;
  /** The token's address, in lower case. */
  readonly currency: string;
}

/** Makes a fetch that pays 1 offer and nothing else. */
type PayingFetch = (offer: Readonly<MppOffer>) => FetchFunction;

interface RequestOptions {
  readonly body?: unknown;
  readonly idempotencyKey?: string;
  readonly method?: string;
  readonly query?: Readonly<Record<string, string>>;
}

type RequestFunction = (path: string, options?: Readonly<RequestOptions>) => Promise<unknown>;

type FetchFunction = typeof fetch;

interface ExploreParams {
  readonly category?: string;
  readonly free?: boolean;
  readonly limit?: number;
  readonly method?: string;
  readonly mpp?: boolean;
  readonly path?: string;
  readonly query?: string;
}

interface TweetclawParams {
  readonly body?: unknown;
  readonly idempotencyKey?: string;
  readonly method?: string;
  readonly path: string;
  readonly query?: Readonly<Record<string, boolean | number | string>>;
}

interface ToolResult extends Awaited<ReturnType<AnyAgentTool['execute']>> {
  readonly content: Array<{ readonly text: string; readonly type: 'text' }>;
  readonly details: undefined;
  readonly isError?: true;
}

interface PluginConfig {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly pollingEnabled?: boolean;
  readonly pollingInterval?: number;
  readonly tempoSigningKey?: string;
}

interface EventPollerOptions {
  readonly intervalSeconds: number;
  readonly onEvents: (events: ReadonlyArray<Readonly<Record<string, unknown>>>) => void;
  readonly request: RequestFunction;
}

export type {
  EndpointInfo,
  EndpointParameter,
  EventPollerOptions,
  ExploreParams,
  FetchFunction,
  MppOffer,
  PayingFetch,
  PluginConfig,
  RequestFunction,
  RequestOptions,
  TweetclawParams,
  ToolResult,
};
