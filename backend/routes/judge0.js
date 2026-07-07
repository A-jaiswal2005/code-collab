/**
 * routes/judge0.js (REWRITTEN FOR PISTON API)
 * ---------------------------------------------------------------
 * Proxies code-execution requests to the FREE Piston API.
 * This completely replaces Judge0 and RapidAPI, requiring NO keys.
 * ---------------------------------------------------------------
 */
const express = require("express");
const axios = require("axios");

const router = express.Router();

// 1. Map friendly language names to Piston's required format.
// Using "*" tells Piston to automatically use the latest installed version.
const PISTON_LANGUAGE_MAP = {
  cpp: { language: "c++", version: "*" },
  "c++": { language: "c++", version: "*" },
  python: { language: "python", version: "*" },
  python3: { language: "python", version: "*" },
  javascript: { language: "javascript", version: "*" },
  java: { language: "java", version: "*" },
};

// 2. We keep the legacy map purely so your frontend language 
// dropdown doesn't break if it expects this exact structure.
const LEGACY_JUDGE0_MAP = {
  cpp: 54,
  "c++": 54,
  python: 71,
  python3: 71,
  javascript: 63,
  java: 62,
};

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

    // Look up the Piston language configuration
    const pistonLang = PISTON_LANGUAGE_MAP[language.toLowerCase()];
    if (!pistonLang) {
      return res.status(400).json({
        error: `Unsupported language "${language}". Supported: ${Object.keys(PISTON_LANGUAGE_MAP).join(", ")}`,
      });
    }

    // Call the FREE Piston API instead of Judge0
    const { data } = await axios.post(
      "https://emkc.org/api/v2/piston/execute",
      {
        language: pistonLang.language,
        version: pistonLang.version,
        files: [{ content: code }],
        stdin: stdin,
      },
      { timeout: 20000 }
    );

    // Piston returns data in a different shape (data.run and data.compile).
    // We map it back to the exact shape your frontend expects from Judge0.
    const run = data.run || {};
    const compile = data.compile || {};
    
    // Judge0 status IDs: 3 = Accepted, 6 = Compilation Error, 11 = Runtime Error
    let statusId = 3; 
    let description = "Accepted";

    if (compile.code !== 0 && compile.code != null) {
      statusId = 6;
      description = "Compilation Error";
    } else if (run.code !== 0) {
      statusId = 11;
      description = "Runtime Error";
    }

    return res.json({
      stdout: run.stdout || "",
      stderr: run.stderr || "",
      compile_output: compile.stderr || "",
      message: run.output || "", // Piston combines stdout/stderr into output
      status: { id: statusId, description: description },
      time: 0, // Piston doesn't return execution time directly
      memory: 0,
    });

  } catch (err) {
    console.error("Piston execution error:", err?.response?.data || err.message);
    return res.status(502).json({
      error: "Failed to execute code via Piston.",
      details: err?.response?.data || err.message,
    });
  }
});

// GET /api/execute/languages - frontend dropdown builder
router.get("/languages", (_req, res) => {
  res.json(LEGACY_JUDGE0_MAP);
});

module.exports = router;
