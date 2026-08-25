const axios = require("axios");

async function findJobs(filters = {}) {

    const {
        role = "",
        location = "",
        hours = null,
        skills = [],
        minScore = null,
        salaryMin = null,
        company = ""
    } = filters;

    const params = {
        app_id: process.env.ADZUNA_APP_ID,
        app_key: process.env.ADZUNA_APP_KEY,
        results_per_page: 50,
        sort_by: "date"
    };

    if (role) {
        params.what = role;
    }

    if (location) {
        params.where = location;
    }

    const response = await axios.get(
        "https://api.adzuna.com/v1/api/jobs/us/search/1",
        { params }
    );

    const cutoffTime =
        hours !== null
            ? Date.now() - hours * 60 * 60 * 1000
            : null;

    const normalizedSkills = skills.map(
        skill => skill.toLowerCase()
    );

    const normalizedCompany =
        company?.toLowerCase() || "";

    const jobs = response.data.results

        // Time filter
        .filter(job => {

            if (cutoffTime === null) {
                return true;
            }

            const created =
                new Date(job.created).getTime();

            return created >= cutoffTime;
        })

        // Calculate match score
        .map(job => {

            const searchableText = `
        ${job.title || ""}
        ${job.description || ""}
      `.toLowerCase();

            const matchedSkills =
                normalizedSkills.filter(skill =>
                    searchableText.includes(skill)
                );

            const matchScore =
                normalizedSkills.length > 0
                    ? Math.round(
                        (
                            matchedSkills.length /
                            normalizedSkills.length
                        ) * 100
                    )
                    : null;

            return {

                id: job.id,

                title: job.title,

                company:
                    job.company?.display_name || null,

                location:
                    job.location?.display_name || null,

                created:
                    job.created,

                description:
                    job.description || null,

                matchedSkills,

                matchScore,

                salaryMin:
                    job.salary_min || null,

                salaryMax:
                    job.salary_max || null,

                applyUrl:
                    job.redirect_url || null
            };
        })

        // Company filter
        .filter(job => {

            if (!normalizedCompany) {
                return true;
            }

            return (
                job.company &&
                job.company
                    .toLowerCase()
                    .includes(normalizedCompany)
            );
        })

        // Salary filter
        .filter(job => {

            if (salaryMin === null) {
                return true;
            }

            if (job.salaryMin === null) {
                return false;
            }

            return job.salaryMin >= salaryMin;
        })

        // Match score filter
        .filter(job => {

            if (minScore === null) {
                return true;
            }

            return (job.matchScore ?? 0) >= minScore;
        })

        // Highest match first
        .sort(
            (a, b) =>
                (b.matchScore ?? 0) -
                (a.matchScore ?? 0)
        );

    return jobs;
}

module.exports = {
    findJobs
};