// SPDX-FileCopyrightText: 2026 Xquik Contributors
//
// SPDX-License-Identifier: MIT

// Everything TweetClaw decides about the Xquik API that the OpenAPI spec cannot
// state. scripts/generate-api-contract.mjs reads this file and takes the rest
// from the spec. Operations use the spec's own spelling, such as
// "GET /api/v1/x/tweets/{id}".

const CATALOG_POLICY = {
  // Left out of the catalog and refused by the request layer. An entry may name
  // an operation that the live spec does not publish yet.
  excluded: [
    // Checkout and guest wallets need a browser and a payment decision.
    "GET /api/v1/credits/topup/redirect",
    "GET /api/v1/guest-wallets/status",
    "POST /api/v1/guest-wallets",
    "POST /api/v1/guest-wallets/topups",
    // Connecting an X account takes credentials and email codes.
    "POST /api/v1/x/account-connection-challenges/{id}/submit",
    "POST /api/v1/x/accounts",
    "POST /api/v1/x/accounts/{id}/reauth",
    // Support files are binary downloads.
    "GET /api/v1/support/attachments/{id}",
  ],

  // Cataloged for reference, hidden from `explore`, and refused by `tweetclaw`.
  // These stay in the dashboard. The generator adds every operation that
  // accepts only a browser session.
  agentProhibited: [
    // Account settings.
    "PATCH /api/v1/account",
    "PUT /api/v1/account/x-identity",
    // Billing.
    "POST /api/v1/subscribe",
    "POST /api/v1/credits/topup",
    "GET /api/v1/credits/topup/status",
    // Connected X account administration.
    "GET /api/v1/x/account-connection-attempts/{id}",
    "GET /api/v1/x/accounts/{id}",
    "DELETE /api/v1/x/accounts/{id}",
    "POST /api/v1/x/accounts/bulk-retry",
    // Support tickets.
    "GET /api/v1/support/tickets",
    "POST /api/v1/support/tickets",
    "GET /api/v1/support/tickets/{id}",
    "PATCH /api/v1/support/tickets/{id}",
    "POST /api/v1/support/tickets/{id}/messages",
  ],

  // Reads of the connected X account's private data. `explore` marks them
  // sensitive and tells the agent to wait for an explicit user request.
  privateReads: [
    "GET /api/v1/x/bookmarks",
    "GET /api/v1/x/bookmarks/folders",
    "GET /api/v1/x/dm/{userId}/history",
    "GET /api/v1/x/notifications",
    "GET /api/v1/x/timeline",
  ],

  // Free reads of public data that run without an approval prompt. Every other
  // call asks first.
  approvalFreeReads: ["GET /api/v1/radar"],

  // Spec tags that share a TweetClaw category. A tag without an entry becomes
  // its own category, named by its lowercase, hyphenated tag.
  categoryByTag: {
    "API Keys": "account",
    Articles: "twitter",
    Broadcasts: "twitter",
    Communities: "twitter",
    Draws: "extraction",
    Events: "monitoring",
    Extractions: "extraction",
    Jobs: "twitter",
    Lists: "twitter",
    Monitors: "monitoring",
    Spaces: "twitter",
    Subscribe: "credits",
    Trends: "twitter",
    Tweets: "twitter",
    Users: "twitter",
    Webhooks: "monitoring",
  },
};

export { CATALOG_POLICY };
