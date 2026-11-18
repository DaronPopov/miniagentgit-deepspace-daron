# PASS 12C financial boundary

**BLOCKED. Maximum financial exposure for the proposed hosted run is unknown.**
The operator has no verified Free-tier zero-overage or hard-spend control for
the assigned production app. The visible balance is an observation of account
state.

On November 18, 2026, authenticated `deepspace app usage --json` on production
reported Free, 500 allocated credits, 499.9977692 remaining, 0.0022308 used,
zero purchased and zero bonus allocation. Values matched before and after
the qualification and feedback submission. The response did not establish
payment-method status, an exhaustion rule, a per-app limit or a maximum
reporting delay. The observations support zero recorded change between
samples. They do not bound the cost of a deployment.

The Terms describe metered compute and other usage charges generally and
authorize billing fees incurred on a payment method on file. They do not
establish the exhaustion behavior of this specific Free slot. The CLI help
describes account-wide usage reporting. Neither evidence fixes a maximum
cost for Worker or Durable Object usage, authentication, deployment,
storage, scheduled CI or rejected ingress on the canonical origin.
[Terms §6](https://deep.space/terms) · [CLI app usage](https://docs.deep.space/cli-reference/commands#app-usage)

The app's local request and resource limits begin after Worker entry. A
client request ceiling, a short test window and observed historical spend
cannot cap unsolicited or delayed billed traffic.

DeepSpace must confirm a production hard stop with zero overage or document
a supported hard monetary ceiling with sufficient scope and accounting at
exhaustion, including rejects and delayed usage. The operator would then
review the confirmed maximum and authorize the bounded run separately.
No billing or payment setting was changed. Follow provider report
`8934f453-b71a-4dfb-bcac-54749cab8b48`.
