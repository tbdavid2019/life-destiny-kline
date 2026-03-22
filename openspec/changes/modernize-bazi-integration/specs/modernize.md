## ADDED Requirements

### Requirement: automated-bazi-calculation
The application must allow users to simply pick their birth date and time, and automatically calculate the corresponding Bazi pillars and major cycles (Da Yun).

#### Scenario: Date/Time Input Transforms to Pillars
- **WHEN** the user selects a birth date and time.
- **THEN** the application must instantly update the Four Pillars (Year, Month, Day, Hour) and Major Cycle (Starting Age, First Da Yun) fields with calculated values.

### Requirement: auto-bazi-analysis
The application must provide a way to automatically generate a Bazi analysis by calling an LLM API directly. This removes the need for users to manually copy and paste prompts and responses.

#### Scenario: Successful Automated Analysis
- **WHEN** the user provides valid API credentials (API Key, Base URL, Model) and valid birth information (name, gender, birth year, pillars, start age, first Da Yun).
- **THEN** clicking "Generate Life K-Line" should trigger an API call to the specified LLM, and upon a successful (and parseable) response, transition the UI to the analysis results view.

#### Scenario: API Error Handling
- **WHEN** the API returns an error (e.g., 401 Unauthorized, 404 Not Found, or connection timeout).
- **THEN** the application must display a clear and helpful error message to the user, remaining on the input screen.

### Requirement: resilient-json-import
The application's JSON parsing logic must be robust enough to handle LLM responses that are not "pure" JSON (e.g., responses containing markdown code blocks, introductory text, or concluding remarks).

#### Scenario: Extracting JSON from Markdown
- **WHEN** a user (or the automated agent) provides a text string containing a JSON object wrapped in ```json ... ``` blocks.
- **THEN** the application must successfully extract and parse the JSON, ignoring the markdown markers and any surrounding text.

#### Scenario: Handling Malformed JSON Snippets
- **WHEN** the input text contains a valid JSON object but also contains leading/trailing non-JSON characters (e.g., "Here is your analysis: { ... } Hope this helps!").
- **THEN** the application must find the outermost { ... } structure and attempt to parse it as the primary data object.
