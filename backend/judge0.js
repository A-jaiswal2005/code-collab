/**
 * routes/judge0.js
 * ---------------------------------------------------------------
 * Proxies code-execution requests to Judge0. Keeping this on the
 * server means the API key never has to be exposed to the browser,
 * and lets us normalize the response shape for the frontend.
 * ---------------------------------------------------------------
 */
const express = require("express");
const axios = require("axios");

const router = express.Router();

// Map friendly language names coming from the editor's language
// selector to Judge0's numeric language IDs.
// Full list: https://ce.judge0.com/#statuses-and-languages-language-get
const LANGUAGE_ID_MAP = {
  cpp: 54, // C++ (GCC 9.2.0)
  "c++": 54,
  python: 71, // Python (3.8.1)
  python3: 71,
  javascript: 63, // Node.js (12.14.0)
  java: 62, // Java (OpenJDK 13.0.1)
};

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || "";
const JUDGE0_API_HOST = process.env.JUDGE0_API_HOST || "judge0-ce.p.rapidapi.com";

// Build the correct headers depending on whether we're hitting the
// RapidAPI-hosted Judge0 or a self-hosted instance.
function buildHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (JUDGE0_API_KEY) {
    headers["X-RapidAPI-Key"] = JUDGE0_API_KEY;
    headers["X-RapidAPI-Host"] = JUDGE0_API_HOST;
  }
  return headers;
}

/**
 * POST /api/execute
 * body: { language: "cpp" | "python", code: string, stdin?: string }
 */
router.post("/execute", async (req, res) => {
  try {
    const { language, code, stdin = "" } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: "`language` and `code` are required." });
    }

    const languageId = LANGUAGE_ID_MAP[language.toLowerCase()];
    if (!languageId) {
      return res.status(400).json({
        error: `Unsupported language "${language}". Supported: ${Object.keys(LANGUAGE_ID_MAP).join(", ")}`,
      });
    }

    if (!JUDGE0_API_KEY) {
      // Fail gracefully with a clear message instead of a confusing 401
      // from Judge0 - lets the frontend show something actionable.
      return res.status(501).json({
        error:
          "Judge0 API key not configured on the server. Set JUDGE0_API_KEY (and JUDGE0_API_URL/JUDGE0_API_HOST if self-hosting) in your environment.",
      });
    }

    // wait=true makes Judge0 execute synchronously and return the
    // result directly (simpler than polling a submission token).
    const submissionUrl = `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`;

    const { data } = await axios.post(
      submissionUrl,
      {
        source_code: code,
        language_id: languageId,
        stdin,
      },
      { headers: buildHeaders(), timeout: 20000 }
    );

    return res.json({
      stdout: data.stdout,
      stderr: data.stderr,
      compile_output: data.compile_output,
      message: data.message,
      status: data.status, // { id, description }
      time: data.time,
      memory: data.memory,
    });
  } catch (err) {
    console.error("Judge0 execution error:", err?.response?.data || err.message);
    return res.status(502).json({
      error: "Failed to execute code via Judge0.",
      details: err?.response?.data || err.message,
    });
  }
});

// GET /api/execute/languages - lets the frontend build its language dropdown
router.get("/languages", (_req, res) => {
  res.json(LANGUAGE_ID_MAP);
});

module.exports = router;