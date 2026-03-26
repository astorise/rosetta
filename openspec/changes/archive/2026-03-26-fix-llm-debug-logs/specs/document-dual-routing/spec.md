## ADDED Requirements

### Requirement: Workers log raw teacher model output in debug mode

The system MUST enable `worker-pdf`, `worker-html`, and `worker-jar` to log the raw, unmodified string output from the teacher model when a `DEBUG_LLM_OUTPUT` environment variable is set to `true`.

#### Scenario: A worker runs with debug mode enabled
- **GIVEN** `DEBUG_LLM_OUTPUT` is `true`
- **WHEN** the worker receives a response from the teacher model
- **THEN** it prints the raw string response to standard output before JSON parsing

#### Scenario: A worker runs with debug mode disabled
- **GIVEN** `DEBUG_LLM_OUTPUT` is not `true`
- **WHEN** the worker receives a response from the teacher model
- **THEN** it does not print the raw string response
