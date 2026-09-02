require("dotenv").config();

const { findJobs } = require("./jobService");
const { sendJobAlert } = require("./email-service");

async function runOnce() {
  try {
    const filters = {
      role: process.env.JOB_ROLE || "",
      location: process.env.JOB_LOCATION || "",
      hours: process.env.JOB_HOURS ? Number(process.env.JOB_HOURS) : 24,
      skills: process.env.JOB_SKILLS
        ? process.env.JOB_SKILLS.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      minScore: process.env.JOB_MIN_SCORE ? Number(process.env.JOB_MIN_SCORE) : null,
      salaryMin: process.env.JOB_SALARY_MIN ? Number(process.env.JOB_SALARY_MIN) : null,
      company: process.env.JOB_COMPANY || "",
    };

    console.log("Running job search with filters:", filters);

    const jobs = await findJobs(filters);

    console.log(`Found ${jobs.length} matching jobs`);

    if (jobs.length === 0) {
      console.log("No matching jobs found.");
      process.exit(0);
    }

    const results = await sendJobAlert(jobs, filters);

    console.log("Email results:", results);

    process.exit(0);
  } catch (err) {
    console.error("run-daily failed:", err.message || err);
    process.exit(1);
  }
}

runOnce();
