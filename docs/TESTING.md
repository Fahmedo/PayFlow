# Testing Guide

This document explains how to run the FlowPay test suite, what is currently covered, and how to write new tests.

---

## Running the Tests

```bash
cd contract
cargo test
```

Expected output:

```
running 3 tests
test test::test_cancel               ... ok
test test::test_subscribe_and_charge ... ok
test test::test_charge_too_early     ... ok

test result: ok. 3 passed; 0 failed; 0 ignored
```

To see `println!` output during tests:

```bash
cargo test -- --nocapture
```

To run a single test by name:

```bash
cargo test test_cancel
```

---

## Test Environment

FlowPay tests use the Soroban SDK's built-in test utilities (`soroban-sdk` with the `testutils` feature). This gives us:

- `Env::default()` — an in-memory Soroban environment, no network required
- `env.mock_all_auths()` — bypasses `require_auth()` checks so tests don't need real signatures
- `env.register_stellar_asset_contract_v2()` — deploys a real SAC token in the test environment
- `env.ledger().with_mut()` — lets us fast-forward the ledger timestamp to simulate time passing

---

## Test Setup (`setup()`)

Every test calls the shared `setup()` helper which:

1. Creates a default `Env`
2. Deploys a test SAC token and mints 10,000 tokens to the test user
3. Approves the FlowPay contract to spend those tokens
4. Deploys the FlowPay contract
5. Calls `initialize()` with the test token address
6. Returns `(env, contract_id, token_addr, user, merchant)`

```rust
fn setup() -> (Env, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_addr = token_id.address();

    let contract_id = env.register_contract(None, FlowPay);

    let user = Address::generate(&env);
    let merchant = Address::generate(&env);

    let sac = StellarAssetClient::new(&env, &token_addr);
    sac.mint(&user, &10_000_0000000);

    let token = TokenClient::new(&env, &token_addr);
    token.approve(&user, &contract_id, &10_000_0000000, &200);

    let client = FlowPayClient::new(&env, &contract_id);
    client.initialize(&token_addr);

    (env, contract_id, token_addr, user, merchant)
}
```

---

## Current Test Coverage

### `test_subscribe_and_charge`

Verifies the happy path end-to-end:

1. Calls `subscribe()` with a 30-day interval and 5 token amount
2. Reads back the subscription and asserts it is active with the correct amount
3. Advances the ledger timestamp past the interval
4. Calls `charge()` and asserts `last_charged` was updated

```rust
#[test]
fn test_subscribe_and_charge() { ... }
```

### `test_cancel`

Verifies that `cancel()` sets `active = false`:

1. Subscribes a user
2. Calls `cancel()`
3. Reads back the subscription and asserts `active == false`

```rust
#[test]
fn test_cancel() { ... }
```

### `test_charge_too_early`

Verifies that `charge()` panics when called before the interval elapses:

1. Subscribes a user
2. Immediately calls `charge()` without advancing the ledger
3. Expects a panic with the message `"interval not elapsed yet"`

```rust
#[test]
#[should_panic(expected = "interval not elapsed yet")]
fn test_charge_too_early() { ... }
```

---

## Writing New Tests

Add new tests to `contract/src/test.rs`. Always use the `setup()` helper to avoid boilerplate.

### Template

```rust
#[test]
fn test_your_feature() {
    let (env, contract_id, _token_addr, user, merchant) = setup();
    let client = FlowPayClient::new(&env, &contract_id);

    // arrange
    client.subscribe(&user, &merchant, &1_0000000, &86400);

    // act
    // ...

    // assert
    // ...
}
```

### Testing panics

Use `#[should_panic(expected = "...")]` to assert that a function panics with a specific message:

```rust
#[test]
#[should_panic(expected = "subscription is not active")]
fn test_charge_after_cancel() {
    let (env, contract_id, _token_addr, user, merchant) = setup();
    let client = FlowPayClient::new(&env, &contract_id);

    client.subscribe(&user, &merchant, &1_0000000, &86400);
    client.cancel(&user);

    env.ledger().with_mut(|l| { l.timestamp += 86401; });
    client.charge(&user); // should panic
}
```

### Advancing time

```rust
env.ledger().with_mut(|l| {
    l.timestamp += 86_400 + 1; // advance by 1 day + 1 second
});
```

---

## Suggested Tests to Add

These are not yet implemented and are good contribution opportunities:

| Test | What to verify |
| --- | --- |
| `test_pay_per_use` | `pay_per_use()` transfers the correct amount |
| `test_pay_per_use_inactive` | `pay_per_use()` panics on a cancelled subscription |
| `test_charge_after_cancel` | `charge()` panics after `cancel()` |
| `test_double_initialize` | Second `initialize()` call panics |
| `test_resubscribe` | Calling `subscribe()` again overwrites the old subscription |
| `test_zero_amount` | `subscribe()` panics with `amount = 0` |
| `test_zero_interval` | `subscribe()` panics with `interval = 0` |
| `test_multiple_users` | Two users can have independent subscriptions |

---

## Frontend Tests

Frontend tests are not yet implemented. Contributions are welcome. The recommended stack is:

- [Vitest](https://vitest.dev/) for unit tests
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for component tests
- Mock `stellar.ts` to avoid real network calls in tests

```bash
cd frontend
npm run test   # once implemented
```
