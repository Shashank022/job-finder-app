const cron = require("node-cron");
const { findJobs } = require("./jobService");
const { sendJobAlert } = require("./email-service");

function startScheduler() {

    cron.schedule(
        "0 8 * * *",

        async () => {
            console.log("=================================");
            console.log("Starting scheduled job search...");
            console.log("Time:", new Date().toISOString());
            console.log("=================================");

            try {

                const filters = {
                    role: "Senior Java Developer",
                    location: "",
                    hours: 24,

                    skills: [
                        "java",
                        "spring boot",
                        "microservices",
                        "kafka",
                        "kubernetes",
                        "aws",
                        "azure"
                    ],

                    minScore: 50,
                    salaryMin: null,
                    company: ""
                };

                const jobs = await findJobs(filters);

                console.log(`Found ${jobs.length} matching jobs`);

                if (jobs.length === 0) {
                    console.log("No matching jobs found.");
                    return;
                }

                await sendJobAlert(jobs, filters);

                console.log("Job alert email sent successfully!");

            } catch (error) {

                console.error(
                    "Scheduled job search failed:",
                    error.message
                );

            }
        },

        {
            timezone: "America/Chicago",
            noOverlap: true
        }
    );

    console.log(
        "Job scheduler started - runs every day at 8:00 AM Central"
    );
}

module.exports = {
    startScheduler
};