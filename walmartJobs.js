const fs = require("fs/promises");

const BASE_URL = "https://walmart.wd504.myworkdayjobs.com";
const TENANT = "walmart";
const SITE = "WalmartExternal";

const SEARCH_URL =
    `${BASE_URL}/wday/cxs/${TENANT}/${SITE}/jobs`;

const PAGE_SIZE = 20;

// ============================================================
// Parse "Posted 5 Days Ago"
// ============================================================
function getPostedDays(postedOn) {

    if (!postedOn) {
        return Infinity;
    }

    const text = postedOn
        .toLowerCase()
        .trim();

    if (text.includes("today")) {
        return 0;
    }

    if (text.includes("yesterday")) {
        return 1;
    }

    // Handles:
    // Posted 1 Day Ago
    // Posted 5 Days Ago
    // Posted 30+ Days Ago
    const match = text.match(/(\d+)\+?\s+days?/);

    if (match) {
        return Number(match[1]);
    }

    return Infinity;
}


// ============================================================
// Extract R-xxxxxxx
// ============================================================
function extractJobId(path = "") {

    const match = path.match(/R-\d+/i);

    return match
        ? match[0].toUpperCase()
        : null;
}


// ============================================================
// Check title
// ============================================================
function isSeniorSoftwareEngineer(title = "") {

    const normalized = title
        .toLowerCase()
        .replace(/[(),\-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return (
        normalized.includes("senior") &&
        normalized.includes("software engineer")
    );
}


// ============================================================
// Check Bentonville
//
// IMPORTANT:
// Don't only check locationsText.
//
// Example:
// locationsText = "2 Locations"
//
// externalPath could still contain:
// /job/Bentonville-AR/...
// ============================================================
function isBentonvilleJob(job) {

    const location =
        (job.location || "").toLowerCase();

    const externalPath =
        (job.externalPath || "")
            .toLowerCase()
            .replace(/-/g, " ");

    const combined =
        `${location} ${externalPath}`;

    return combined.includes("bentonville");
}


// ============================================================
// Search Walmart
// ============================================================
async function searchWalmartJobs(
    searchText,
    maxResults = 200
) {

    const jobs = [];

    let offset = 0;
    let total = 0;

    while (jobs.length < maxResults) {

        console.log(
            `Fetching offset=${offset}`
        );

        const body = {
            appliedFacets: {},
            limit: PAGE_SIZE,
            offset,
            searchText
        };

        const response = await fetch(
            SEARCH_URL,
            {
                method: "POST",

                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Accept-Language": "en-US,en;q=0.9"
                },

                body: JSON.stringify(body)
            }
        );

        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                `HTTP ${response.status}: ${errorText}`
            );
        }

        const data =
            await response.json();

        total =
            data.total || 0;

        const postings =
            data.jobPostings || [];

        console.log(
            `Received ${postings.length}, total=${total}`
        );

        if (postings.length === 0) {
            break;
        }

        for (const posting of postings) {

            const job = {

                jobId:
                    extractJobId(
                        posting.externalPath
                    ),

                title:
                    posting.title || "",

                location:
                    posting.locationsText ||
                    posting.location ||
                    "",

                postedOn:
                    posting.postedOn || "",

                externalPath:
                    posting.externalPath || "",

                jobUrl:
                    posting.externalPath
                        ? BASE_URL + posting.externalPath
                        : ""
            };

            jobs.push(job);

            if (jobs.length >= maxResults) {
                break;
            }
        }

        offset += PAGE_SIZE;

        if (offset >= total) {
            break;
        }
    }

    return jobs;
}


// ============================================================
// Main
// ============================================================
async function main() {

    const SEARCH_TEXT =
        "senior software engineer";

    const MAX_POSTED_DAYS = 5;

    console.log();
    console.log("===============================");
    console.log(" Walmart Job Finder");
    console.log("===============================");
    console.log();

    console.log(
        `Search: ${SEARCH_TEXT}`
    );

    console.log(
        `Location: Bentonville`
    );

    console.log(
        `Posted: <= ${MAX_POSTED_DAYS} days`
    );

    console.log();

    try {

        const jobs =
            await searchWalmartJobs(
                SEARCH_TEXT,
                200
            );


        // ========================================================
        // IMPORTANT DEBUG
        // Print exactly what Walmart returned
        // ========================================================

        console.log();
        console.log(
            "========== RAW RESULTS =========="
        );

        jobs.forEach((job, index) => {

            console.log();
            console.log(
                `${index + 1}. ${job.title}`
            );

            console.log(
                `   ID: ${job.jobId}`
            );

            console.log(
                `   Location: "${job.location}"`
            );

            console.log(
                `   Posted: "${job.postedOn}"`
            );

            console.log(
                `   Path: "${job.externalPath}"`
            );
        });


        // ========================================================
        // Filter
        // ========================================================

        const filteredJobs =
            jobs.filter(job => {

                const titleMatch =
                    isSeniorSoftwareEngineer(
                        job.title
                    );

                const locationMatch =
                    isBentonvilleJob(job);

                const days =
                    getPostedDays(
                        job.postedOn
                    );

                const dateMatch =
                    days <= MAX_POSTED_DAYS;


                // Debug rejected jobs
                if (
                    titleMatch &&
                    !locationMatch
                ) {

                    console.log(
                        `❌ LOCATION REJECTED: ${job.title}`
                    );

                    console.log(
                        `   Location=${job.location}`
                    );

                    console.log(
                        `   Path=${job.externalPath}`
                    );
                }


                if (
                    titleMatch &&
                    locationMatch &&
                    !dateMatch
                ) {

                    console.log(
                        `❌ DATE REJECTED: ${job.title}`
                    );

                    console.log(
                        `   Posted=${job.postedOn}`
                    );

                    console.log(
                        `   Days=${days}`
                    );
                }


                return (
                    titleMatch &&
                    locationMatch &&
                    dateMatch
                );
            });


        // ========================================================
        // Final results
        // ========================================================

        console.log();
        console.log();
        console.log(
            "======================================"
        );

        console.log(
            " SENIOR SOFTWARE ENGINEER - BENTONVILLE"
        );

        console.log(
            " POSTED WITHIN LAST 5 DAYS"
        );

        console.log(
            "======================================"
        );


        if (filteredJobs.length === 0) {

            console.log();
            console.log(
                "⚠️ No jobs matched all filters."
            );

        }


        filteredJobs.forEach(
            (job, index) => {

                console.log();

                console.log(
                    `${index + 1}. ${job.title}`
                );

                console.log(
                    `   Job ID: ${job.jobId}`
                );

                console.log(
                    `   Location: ${job.location}`
                );

                console.log(
                    `   Posted: ${job.postedOn}`
                );

                console.log(
                    `   Age: ${getPostedDays(job.postedOn)} days`
                );

                console.log(
                    `   URL: ${job.jobUrl}`
                );
            }
        );


        // ========================================================
        // Save
        // ========================================================

        await fs.writeFile(
            "bentonville-senior-jobs.json",
            JSON.stringify(
                filteredJobs,
                null,
                2
            )
        );

        console.log();
        console.log(
            `✅ Found ${filteredJobs.length} matching jobs`
        );

    }
    catch (error) {

        console.error();
        console.error(
            "❌ ERROR:",
            error.message
        );
    }
}


main();