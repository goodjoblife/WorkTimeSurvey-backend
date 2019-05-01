function generateGetWorkingsViewModel(workings, total) {
    const view_workings = workings.map(working => ({
        _id: working._id,
        company: working.company,
        sector: working.sector,
        created_at: working.created_at,
        data_time: working.data_time,
        estimated_hourly_wage: working.estimated_hourly_wage,
        job_title: working.job_title,
        overtime_frequency: working.overtime_frequency,
        salary: working.salary,
        week_work_time: working.week_work_time,
        status: working.status,
        archive: working.archive,
    }));

    const result = {
        total,
        time_and_salary: view_workings,
    };

    return result;
}
module.exports = generateGetWorkingsViewModel;
