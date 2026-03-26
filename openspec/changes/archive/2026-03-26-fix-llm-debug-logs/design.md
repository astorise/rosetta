# System Design: Debug Logging

## Logic
In all three workers (`worker-pdf`, `worker-html`, `worker-jar`), immediately after receiving the text response from the Gemini/Teacher API, evaluate the environment variable `DEBUG_LLM_OUTPUT`.
If it is set to `true` or `1`, use `println!("RAW LLM OUTPUT:\n{}", raw_response);`.

*Note*: We use `println!` because Cloud Run captures `stdout` natively.