
function generateGetExperiencesViewModel(experiences, total) {
    const MAX_PREVIEW_SIZE = 160;

    const view_experiences = experiences.map(experience => {
        let experience_view_model = {
            _id: experience._id,
            type: experience.type,
            created_at: experience.created_at,
            company: experience.company,
            job_title: experience.job_title,
            title: experience.title,
            preview: (() => {
                if (experience.sections[0]) {
                    return experience.sections[0].content.substring(0, MAX_PREVIEW_SIZE);
                }
                return null;
            })(),
            like_count: experience.like_count,
            reply_count: experience.reply_count,
            report_count: experience.report_count,
            status: experience.status,
        };
        if (experience.type === 'interview') {
            experience_view_model = Object.assign(experience_view_model, {
                region: experience.region,
                salary: experience.salary,
            });
        } else if (experience.type === 'work') {
            experience_view_model = Object.assign(experience_view_model, {
                region: experience.region,
                salary: experience.salary,
                week_work_time: experience.week_work_time,
            });
        }
        return experience_view_model;
    });

    const result = {
        total,
        experiences: view_experiences,
    };

    return result;
}
module.exports = generateGetExperiencesViewModel;
