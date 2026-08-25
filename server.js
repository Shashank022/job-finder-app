const express = require("express");
require("dotenv").config();

const { findJobs } = require("./jobService");
const { sendJobAlert } = require("./email-service")
const { startScheduler } = require("./scheduler");

const app = express();

app.use(express.json());

app.get("/api/jobs/latest", async (req, res) => {

    try {

        const filters = {

            role:
                req.query.role || "",

            location:
                req.query.location || "",

            hours:
                req.query.hours
                    ? Number(req.query.hours)
                    : null,

            skills:
                req.query.skills
                    ? req.query.skills
                        .split(",")
                        .map(skill => skill.trim())
                    : [],

            minScore:
                req.query.minScore
                    ? Number(req.query.minScore)
                    : null,

            salaryMin:
                req.query.salaryMin
                    ? Number(req.query.salaryMin)
                    : null,

            company:
                req.query.company || ""
        };

        const jobs =
            await findJobs(filters);

        let emailSent = false;

        if (
            req.query.email === "true" &&
            jobs.length > 0
        ) {

            await sendJobAlert(
                jobs,
                filters
            );

            emailSent = true;
        }

        res.json({

            filters,

            count:
                jobs.length,

            emailSent,

            jobs
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            message:
                "Unable to fetch jobs",

            error:
                error.message
        });
    }
});

startScheduler();

const PORT =
    process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(
        `Job API running at http://localhost:${PORT}`
    );

});