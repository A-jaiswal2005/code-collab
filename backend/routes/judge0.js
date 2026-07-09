/**
 * routes/judge0.js (REWRITTEN FOR ONLINECOMPILER.IO)
 * ---------------------------------------------------------------
 * Proxies code-execution requests to api.onlinecompiler.io.
 * ---------------------------------------------------------------
 */
const express = require("express");
const router = express.Router();

// 1. Map frontend language names to OnlineCompiler.io compiler IDs
// 1. Map frontend language names to exact OnlineCompiler.io compiler IDs
const compilerMap = {
    'cpp': 'g++-15',             
    'c++': 'g++-15',             
    'c': 'gcc-15',               
    'python': 'python-3.14',
    'python3': 'python-3.14',
    'java': 'openjdk-25',        
    'javascript': 'typescript-deno', 
    'go': 'go-1.26',
    'rust': 'rust-1.93'
};

// 2. Kept purely so your frontend language dropdown doesn't break
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

        // Look up the OnlineCompiler compiler ID
        const compilerId = compilerMap[language.toLowerCase()];
        if (!compilerId) {
            return res.status(400).json({
                error: `Unsupported language "${language}". Supported: ${Object.keys(compilerMap).join(", ")}`,
            });
        }

        // Hit the secure synchronous endpoint
        const response = await fetch('https://api.onlinecompiler.io/api/run-code-sync/', {
            method: 'POST',
            headers: {
                'Authorization': process.env.ONLINE_COMPILER_API_KEY, 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                compiler: compilerId,
                code: code,
                input: stdin // Maps your frontend's 'stdin' to their 'input'
            })
        });

        if (!response.ok) {
            const errData = await response.text();
            throw new Error(`API Error: ${response.status} - ${errData}`);
        }

        const data = await response.json();

        // Map OnlineCompiler outputs to the Judge0 format your frontend expects
        let statusId = 3; // 3 = Accepted
        let description = "Accepted";

        if (data.error) {
            // Check if it's a compilation or runtime error to match Judge0 statuses
            const isCompileErr = data.error.toLowerCase().includes("compile") || data.error.toLowerCase().includes("error");
            statusId = isCompileErr ? 6 : 11; // 6 = Compilation Error, 11 = Runtime Error
            description = isCompileErr ? "Compilation Error" : "Runtime Error";
        }

        return res.json({
            stdout: data.output || "",
            stderr: data.error || "",
            compile_output: data.error || "", 
            message: data.output || data.error || "", 
            status: { id: statusId, description: description },
            time: data.time || 0,
            memory: data.memory || 0,
        });

    } catch (err) {
        console.error("Execution error:", err.message);
        return res.status(502).json({
            error: "Failed to execute code.",
            details: err.message,
        });
    }
});

// GET /api/execute/languages - frontend dropdown builder
router.get("/languages", (_req, res) => {
    res.json(LEGACY_JUDGE0_MAP);
});

module.exports = router;
