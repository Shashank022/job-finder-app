const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendJobAlert(jobs, filters = {}) {
    if (!jobs || jobs.length === 0) {
        console.log("No jobs to email.");
        return null;
    }

    const recipients = process.env.EMAIL_TO
        ? process.env.EMAIL_TO
            .split(",")
            .map(email => email.trim())
            .filter(Boolean)
        : [];

    if (recipients.length === 0) {
        throw new Error("EMAIL_TO is not configured");
    }

    const jobRows = jobs
        .slice(0, 10)
        .map(job => `
      <div
        style="
          margin-bottom:20px;
          padding:15px;
          border:1px solid #ddd;
          border-radius:8px;
        "
      >
        <h3>
          ${escapeHtml(job.title || "Job")}
        </h3>

        <p>
          <strong>Company:</strong>
          ${escapeHtml(job.company || "Not specified")}
        </p>

        <p>
          <strong>Location:</strong>
          ${escapeHtml(job.location || "Not specified")}
        </p>

        <p>
          <strong>Match Score:</strong>
          ${job.matchScore ?? "N/A"}%
        </p>

        <p>
          <strong>Matched Skills:</strong>
          ${job.matchedSkills?.length
                ? job.matchedSkills
                    .map(escapeHtml)
                    .join(", ")
                : "N/A"
            }
        </p>

        ${job.applyUrl
                ? `
              <a
                href="${escapeHtml(job.applyUrl)}"
                style="
                  display:inline-block;
                  padding:10px 16px;
                  background:#0a66c2;
                  color:white;
                  text-decoration:none;
                  border-radius:5px;
                "
              >
                Apply for Job
              </a>
            `
                : ""
            }
      </div>
    `)
        .join("");

    const emailHtml = `
    <div
      style="
        font-family:Arial,sans-serif;
        max-width:700px;
        margin:auto;
      "
    >
      <h1>Daily Job Finder</h1>

      <p>
        Found <strong>${jobs.length}</strong>
        matching jobs.
      </p>

      <p>
        <strong>Role:</strong>
        ${escapeHtml(filters.role || "Any")}
        <br/>

        <strong>Location:</strong>
        ${escapeHtml(filters.location || "Any")}
        <br/>

        <strong>Posted within:</strong>
        ${filters.hours || "Any"} hours
        <br/>

        <strong>Minimum match:</strong>
        ${filters.minScore ?? "Any"}%
      </p>

      <hr/>

      ${jobRows}
    </div>
  `;

    const results = [];

    // Send the same email to each recipient
    for (const recipient of recipients) {
        console.log(`Sending job alert to ${recipient}`);

        try {
            const { data, error } = await resend.emails.send({
                from: "Job Finder <onboarding@resend.dev>",
                to: recipient,

                subject:
                    `Job Finder Alert - ${jobs.length} matching jobs`,

                html: emailHtml
            });

            if (error) {
                console.error(
                    `Failed sending to ${recipient}:`,
                    error
                );

                results.push({
                    recipient,
                    success: false,
                    error
                });

                continue;
            }

            console.log(
                `Email sent successfully to ${recipient}`
            );

            results.push({
                recipient,
                success: true,
                data
            });

        } catch (error) {
            console.error(
                `Error sending to ${recipient}:`,
                error.message
            );

            results.push({
                recipient,
                success: false,
                error: error.message
            });
        }
    }

    return results;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

module.exports = {
    sendJobAlert
};